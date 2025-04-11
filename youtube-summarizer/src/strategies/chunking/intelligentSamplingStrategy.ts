import { BaseChunkingStrategy } from './baseStrategy';

/**
 * Intelligent Sampling Strategy
 * 
 * Attempts to identify and retain the most important sections of the transcript.
 * Uses heuristics to detect significant content based on keyword density and patterns.
 * Good for videos with varying information density.
 */
export class IntelligentSamplingStrategy extends BaseChunkingStrategy {
  // Common keywords that might indicate important information
  private importantKeywords = [
    'summary', 'conclusion', 'therefore', 'important', 'key', 'significant',
    'result', 'finding', 'main point', 'takeaway', 'highlight', 'critical',
    'essential', 'crucial', 'finally', 'in summary', 'to summarize',
    'ultimately', 'in conclusion', 'altogether', 'overall'
  ];

  /**
   * Chunks a transcript using intelligent sampling to focus on important content
   * @param transcript The transcript to chunk
   * @param maxLength The maximum length of each chunk
   * @returns Array of transcript chunks
   */
  chunkTranscript(transcript: string, maxLength: number): string[] {
    console.log(`Starting intelligent chunking process for transcript of ${transcript.length} characters`);
    
    // Split transcript into sentences
    const sentences = this.splitIntoSentences(transcript);
    console.log(`Split transcript into ${sentences.length} sentences`);
    
    if (sentences.length <= 1) {
      console.log(`Only ${sentences.length} sentence found, returning full transcript`);
      return [transcript]; // If single sentence or couldn't parse, return as is
    }
    
    // Calculate how many sentences we need to sample to stay within token limits
    const totalTokens = this.estimateTokens(transcript);
    console.log(`Estimated ${totalTokens} tokens in transcript`);
    
    // Set maximum chunk size (in tokens) - use smaller chunks for better processing
    const maxTokensPerChunk = 4000; // Optimal size for LLM processing
    
    // Force multiple chunks for transcripts that exceed a minimum size
    // This ensures we get more than 1 chunk for most videos
    const minimumChunking = 3000; // Lower threshold to force chunking even for smaller transcripts
    // Reduce target chunk size to ensure more chunks
    const targetChunkSize = Math.min(1500, Math.floor(totalTokens / Math.max(3, Math.ceil(totalTokens / minimumChunking))));
    
    console.log(`Using target chunk size of ${targetChunkSize} tokens`);
    
    // If transcript is very small, don't sample but still create chunks
    if (totalTokens <= minimumChunking) {
      const chunks = this.createForcedChunks(sentences, targetChunkSize);
      console.log(`Transcript is small (${totalTokens} tokens), created ${chunks.length} simple chunks`);
      return chunks;
    }
    
    // For longer transcripts, use intelligent sampling
    console.log(`Using intelligent sampling for longer transcript`);
    const scoredSentences = this.scoreSentences(sentences);
    
    // Extract continuous important segments rather than individual sentences
    const reductionFactor = Math.max(1.1, totalTokens / (targetChunkSize * Math.ceil(totalTokens / maxTokensPerChunk)));
    console.log(`Using reduction factor of ${reductionFactor}`);
    
    const importantSegments = this.extractImportantSegments(scoredSentences, reductionFactor);
    console.log(`Extracted ${importantSegments.length} important segments`);
    
    // Flatten segments back to sentences
    const sampledSentences = importantSegments.flat();
    console.log(`Flattened to ${sampledSentences.length} sentences (from original ${sentences.length})`);
    
    // Create transcript chunks from the sampled sentences
    const chunks = this.createForcedChunks(sampledSentences, targetChunkSize);
    console.log(`Created ${chunks.length} chunks from sampled sentences`);
    
    return chunks;
  }
  
  /**
   * Creates chunks with forced minimum number for better processing
   * @param sentences Array of sentences
   * @param targetSize Target token size for each chunk
   * @returns Array of chunks with forced minimum number
   */
  private createForcedChunks(sentences: string[], targetSize: number): string[] {
    // Make sure we create at least 3 chunks for better quality
    // Lower the threshold to create more chunks even for smaller transcripts
    if (sentences.length > 10) {
      const totalText = sentences.join(' ');
      const totalTokens = this.estimateTokens(totalText);
      
      // Force more chunks - at least 3 for most transcripts
      const minChunks = Math.max(3, Math.ceil(totalTokens / targetSize));
      
      const sentencesPerChunk = Math.floor(sentences.length / minChunks);
      
      // If we can create multiple reasonable chunks, do so
      if (sentencesPerChunk >= 3) {
        return this.createLargerContextChunks(sentences, targetSize, minChunks);
      }
    }
    
    // For very small transcripts, still try to create at least 2 chunks if possible
    if (sentences.length > 5) {
      return this.createLargerContextChunks(sentences, targetSize, 2);
    }
    
    // Otherwise use standard chunking
    return this.createLargerContextChunks(sentences, targetSize);
  }
  
  /**
   * Creates larger context chunks with overlap to preserve context
   * @param sentences Array of sentences
   * @param targetSize Target token size for each chunk
   * @param minChunks Minimum number of chunks to create (optional)
   * @returns Array of chunks with better context
   */
  private createLargerContextChunks(sentences: string[], targetSize: number, minChunks?: number): string[] {
    const chunks: string[] = [];
    
    // If we have very few sentences, just return as one chunk
    if (sentences.length <= 10) {
      return [sentences.join(' ')];
    }
    
    // Calculate approximate chunks needed
    const totalTokens = this.estimateTokens(sentences.join(' '));
    const calculatedChunks = Math.max(1, Math.ceil(totalTokens / targetSize));
    
    // Use minimum chunks if specified and greater than calculated
    const numChunks = minChunks ? Math.max(calculatedChunks, minChunks) : calculatedChunks;
    
    // Ensure we don't create too many tiny chunks
    const sentencesPerChunk = Math.max(5, Math.ceil(sentences.length / numChunks));
    
    // Create chunks with 15% overlap for better context preservation
    const overlap = Math.ceil(sentencesPerChunk * 0.15);
    
    console.log(`Creating ${numChunks} chunks with ~${sentencesPerChunk} sentences per chunk and ${overlap} sentence overlap`);
    
    for (let i = 0; i < sentences.length; i += (sentencesPerChunk - overlap)) {
      const end = Math.min(i + sentencesPerChunk, sentences.length);
      const chunkSentences = sentences.slice(i, end);
      const chunk = chunkSentences.join(' ');
      
      // Skip empty chunks
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
      
      // If we've reached the end, break
      if (end >= sentences.length) break;
    }
    
    console.log(`Created ${chunks.length} chunks with token estimates: ${chunks.map(c => this.estimateTokens(c)).join(', ')}`);
    
    return chunks;
  }
  
  /**
   * Extracts important continuous segments from scored sentences
   * @param scoredSentences Array of scored sentences
   * @param reductionFactor How much to reduce the content
   * @returns Array of sentence segments (arrays of sentences)
   */
  private extractImportantSegments(
    scoredSentences: Array<{sentence: string, score: number, index: number}>,
    reductionFactor: number
  ): string[][] {
    // Create a copy of scored sentences and sort by index
    const sortedSentences = [...scoredSentences].sort((a, b) => a.index - b.index);
    
    // Mark sentences as important if they're in the top percentile based on reduction factor
    // Lower reduction factor = more content marked as important
    const importanceThreshold = this.calculateImportanceThreshold(sortedSentences, reductionFactor);
    
    // Tag each sentence as important or not
    const taggedSentences = sortedSentences.map(item => ({
      ...item,
      isImportant: item.score >= importanceThreshold
    }));
    
    // Find continuous segments of important sentences
    // and include some context around them
    const segments: string[][] = [];
    let currentSegment: string[] = [];
    let inImportantSection = false;
    
    // Always include beginning and end of transcript
    const startPercentage = 0.15; // First 15%
    const endPercentage = 0.15;   // Last 15%
    
    for (let i = 0; i < taggedSentences.length; i++) {
      const item = taggedSentences[i];
      const isBeginningOrEnd = 
        i < taggedSentences.length * startPercentage || 
        i > taggedSentences.length * (1 - endPercentage);
      
      // Start a new segment if we hit an important sentence or beginning/end
      if (item.isImportant || isBeginningOrEnd) {
        if (!inImportantSection) {
          // Add 2-3 sentences before for context if available
          for (let j = Math.max(0, i - 3); j < i; j++) {
            currentSegment.push(taggedSentences[j].sentence);
          }
        }
        
        inImportantSection = true;
        currentSegment.push(item.sentence);
      } else {
        // If we were in an important section, add more sentences for context
        if (inImportantSection) {
          currentSegment.push(item.sentence);
          
          // Add two more sentences if available for better context
          for (let j = 1; j <= 2 && i + j < taggedSentences.length; j++) {
            currentSegment.push(taggedSentences[i + j].sentence);
          }
          i += 2; // Skip the next two sentences since we just added them
          
          // Save this segment and start a new one
          segments.push([...currentSegment]);
          currentSegment = [];
          inImportantSection = false;
        }
      }
    }
    
    // Add the last segment if not empty
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }
    
    // If we ended up with no segments (rare), fall back to top scored sentences
    if (segments.length === 0) {
      // Keep more sentences since we want high quality
      const percentToKeep = Math.min(0.8, 2.0 / reductionFactor);
      const numSentencesToKeep = Math.ceil(taggedSentences.length * percentToKeep);
      const topSentences = [...scoredSentences]
        .sort((a, b) => b.score - a.score)
        .slice(0, numSentencesToKeep)
        .sort((a, b) => a.index - b.index)
        .map(item => item.sentence);
      
      segments.push(topSentences);
    }
    
    return segments;
  }
  
  /**
   * Calculates the importance threshold based on reduction factor
   */
  private calculateImportanceThreshold(
    scoredSentences: Array<{sentence: string, score: number, index: number}>,
    reductionFactor: number
  ): number {
    // Sort by score descending
    const sortedByScore = [...scoredSentences].sort((a, b) => b.score - a.score);
    
    // Calculate how many sentences to keep based on reduction factor
    // Keep more sentences than strictly needed to ensure continuous segments
    // Increased percentage for higher quality output
    const percentToKeep = Math.min(0.8, 2.0 / reductionFactor);
    const numSentencesToKeep = Math.ceil(scoredSentences.length * percentToKeep);
    
    // Get the score at the cutoff point
    return numSentencesToKeep >= sortedByScore.length 
      ? 0 // Keep all sentences if we're keeping most of them
      : sortedByScore[numSentencesToKeep - 1].score;
  }
  
  /**
   * Scores sentences based on various heuristics to identify importance
   * @param sentences Array of sentences to score
   * @returns Array of scored sentences with their original indices
   */
  private scoreSentences(sentences: string[]): Array<{sentence: string, score: number, index: number}> {
    return sentences.map((sentence, index) => {
      let score = 0;
      const lowerSentence = sentence.toLowerCase();
      
      // 1. Score based on sentence position (beginning and end tend to be important)
      if (index < sentences.length * 0.15) {
        // Beginning is usually most important
        score += 3;
      } else if (index > sentences.length * 0.85) {
        // End is also important
        score += 2.5;
      } else if (index > sentences.length * 0.4 && index < sentences.length * 0.6) {
        // Middle section often contains important content too
        score += 1;
      }
      
      // 2. Score based on sentence length (too short or too long may be less important)
      const wordCount = sentence.split(/\s+/).length;
      if (wordCount > 8 && wordCount < 30) {
        score += 1.5;
      } else if (wordCount >= 30 && wordCount < 60) {
        score += 1; // Longer sentences might still be important
      }
      
      // 3. Score based on keyword presence with position-based weighting
      this.importantKeywords.forEach(keyword => {
        if (lowerSentence.includes(keyword.toLowerCase())) {
          // Higher score if keyword appears near beginning of sentence
          const keywordIndex = lowerSentence.indexOf(keyword.toLowerCase());
          const normalizedPosition = keywordIndex / lowerSentence.length;
          
          if (normalizedPosition < 0.3) {
            score += 3; // Keyword near beginning is more significant
          } else {
            score += 2;
          }
        }
      });
      
      // 4. Score based on presence of numbers (often indicate statistics or key points)
      if (/\d+/.test(sentence)) {
        score += 1.5;
      }
      
      // 5. Score based on presence of quotation marks (often indicate important statements)
      if (/["'].*["']/.test(sentence)) {
        score += 1.5;
      }
      
      return { sentence, score, index };
    });
  }
} 