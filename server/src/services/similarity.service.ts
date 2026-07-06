import prisma from "../config/database";
import { RiskLevel, ProjectStatus, SimilarityReportStatus } from "@prisma/client";
import { ApiError } from "../utils/ApiError";

const stopWords = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "in", "on", "at", "by", 
  "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", 
  "above", "below", "from", "up", "down", "in", "out", "over", "under", "again", "further", "then", 
  "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", 
  "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", 
  "too", "very", "s", "t", "can", "will", "just", "don", "should", "now", "of", "this", "that", 
  "these", "those", "it", "its", "they", "them", "their", "we", "us", "our", "you", "your", "he", 
  "she", "his", "her", "him", "himself", "herself", "itself", "themselves", "i", "me", "my", "myself"
]);

export class SimilarityService {
  /**
   * Tokenizes and cleans a block of text into individual terms.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\n]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.has(word));
  }

  /**
   * Computes the term frequencies for a given set of tokens.
   */
  private getTermFrequencies(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    return tf;
  }

  /**
   * Computes Cosine Similarity between two text documents.
   */
  public calculateCosineSimilarity(text1: string, text2: string): number {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const tf1 = this.getTermFrequencies(tokens1);
    const tf2 = this.getTermFrequencies(tokens2);

    const allTerms = new Set([...tf1.keys(), ...tf2.keys()]);

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (const term of allTerms) {
      const v1 = tf1.get(term) || 0;
      const v2 = tf2.get(term) || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    }

    if (mag1 === 0 || mag2 === 0) return 0;

    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  /**
   * Split text into sentences for fine-grained comparison.
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.split(/\s+/).length > 3); // Must have more than 3 words
  }

  /**
   * Computes Jaccard Similarity between two sentences based on words.
   */
  private getSentenceJaccardSimilarity(s1: string, s2: string): number {
    const set1 = new Set(this.tokenize(s1));
    const set2 = new Set(this.tokenize(s2));

    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Extract matching sentences between a new document and an existing source document.
   */
  private findMatchingSentences(newText: string, sourceText: string) {
    const newSentences = this.splitIntoSentences(newText);
    const sourceSentences = this.splitIntoSentences(sourceText);

    const matches: { matchedText: string; sourceText: string; similarityScore: number }[] = [];

    for (const sNew of newSentences) {
      let bestMatch: string | null = null;
      let highestScore = 0;

      for (const sSource of sourceSentences) {
        const score = this.getSentenceJaccardSimilarity(sNew, sSource);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = sSource;
        }
      }

      // If sentence similarity is high (Jaccard > 0.4), mark as match
      if (highestScore > 0.45 && bestMatch) {
        matches.push({
          matchedText: sNew,
          sourceText: bestMatch,
          similarityScore: Math.round(highestScore * 100),
        });
      }
    }

    return matches;
  }

  /**
   * Determines risk level based on similarity percentage.
   */
  public getRiskLevel(score: number): RiskLevel {
    if (score <= 20) return RiskLevel.LOW;
    if (score <= 40) return RiskLevel.MEDIUM;
    if (score <= 60) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  /**
   * Runs the complete similarity check against all approved/archived documents in the system.
   */
  async checkProjectSimilarity(projectId: string, documentId: string): Promise<void> {
    try {
      // 1. Get the current document details
      const doc = await prisma.projectDocument.findUnique({
        where: { id: documentId },
        select: { extractedText: true, fileName: true },
      });

      if (!doc || !doc.extractedText) {
        throw new ApiError(400, "Document extracted text is missing for similarity check.");
      }

      // 2. Fetch all other approved or archived project documents
      const candidateDocs = await prisma.projectDocument.findMany({
        where: {
          projectId: { not: projectId },
          project: {
            status: { in: [ProjectStatus.APPROVED, ProjectStatus.ARCHIVED] },
          },
        },
        include: {
          project: true,
        },
      });

      // Initialize similarity report status as PROCESSING or PENDING
      const report = await prisma.similarityReport.create({
        data: {
          projectId,
          documentId,
          overallScore: 0,
          riskLevel: RiskLevel.LOW,
          status: SimilarityReportStatus.PENDING,
        },
      });

      const matchesToSave: any[] = [];
      let overallMaxScore = 0;

      // 3. Compare current document with each candidate
      for (const cand of candidateDocs) {
        if (!cand.extractedText) continue;

        // Calculate cosine similarity
        const score = this.calculateCosineSimilarity(doc.extractedText, cand.extractedText);
        const scorePct = Math.round(score * 100);

        if (scorePct > overallMaxScore) {
          overallMaxScore = scorePct;
        }

        // If similarity is above 5%, inspect sentence matches
        if (scorePct >= 5) {
          const sentenceMatches = this.findMatchingSentences(doc.extractedText, cand.extractedText);
          
          for (const sm of sentenceMatches) {
            matchesToSave.push({
              reportId: report.id,
              matchedProjectId: cand.projectId,
              matchedDocumentId: cand.id,
              similarityScore: sm.similarityScore,
              matchedText: sm.matchedText,
              sourceText: sm.sourceText,
            });
          }
        }
      }

      const riskLevel = this.getRiskLevel(overallMaxScore);
      const summary = `Similarity analysis completed. Checked against ${candidateDocs.length} archived documents. Maximum matched document similarity: ${overallMaxScore}%.`;

      // 4. Save results to report and matches
      await prisma.similarityReport.update({
        where: { id: report.id },
        data: {
          overallScore: overallMaxScore,
          riskLevel,
          summary,
          status: SimilarityReportStatus.COMPLETED,
        },
      });

      // Save top matches (cap sentence matches at 20 rows to avoid excessive records)
      const uniqueMatches = matchesToSave
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 25);

      for (const match of uniqueMatches) {
        await prisma.similarityMatch.create({
          data: match,
        });
      }

      // 5. Update Project general similarity score and risk level
      await prisma.project.update({
        where: { id: projectId },
        data: {
          similarityScore: overallMaxScore,
          riskLevel,
        },
      });

      console.log(`Similarity report generated for Project ${projectId}: Score: ${overallMaxScore}%, Risk: ${riskLevel}`);
    } catch (error: any) {
      console.error("Error in checkProjectSimilarity:", error);
      // Try to mark report as failed if it was created
      const report = await prisma.similarityReport.findFirst({
        where: { documentId, status: SimilarityReportStatus.PENDING },
      });
      if (report) {
        await prisma.similarityReport.update({
          where: { id: report.id },
          data: {
            status: SimilarityReportStatus.FAILED,
            summary: `Similarity check failed: ${error.message}`,
          },
        });
      }
    }
  }
}

export const similarityService = new SimilarityService();
export default similarityService;
