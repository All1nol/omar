# YouTube Video Summarizer

This tool creates comprehensive summaries of YouTube videos by analyzing their transcripts using the Gemini API.

## Features

- Fetches YouTube video transcripts
- Uses MapReduce pattern to process videos of any length
- Rate-limited API calls to stay within Gemini API quotas
- Smart chunking with sentence-based segmentation
- Creates well-structured summaries with key points
- Supports videos of any length, including multi-hour content
- Saves summaries as Markdown files

## Requirements

- Node.js 16+
- Gemini API key (get one at [Google AI Studio](https://ai.google.dev/))

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your Gemini API key:
```
GEMINI_API_KEY=your_api_key_here
```

## Usage

Run the tool with:
```
npm start
```

The tool will:
1. Ask for your Gemini API key (if not in `.env`)
2. Ask for the YouTube video URL
3. Fetch and analyze the transcript
4. Generate and save a summary

## Options for Long Videos

For videos over 1 hour long, you can use different modes to balance quality and processing time:

### Standard Mode (Default)
Processes up to 300K characters (~75K tokens) of transcript

```
npm start
```

### Long Video Mode
Faster processing with intelligent sampling of very long transcripts

```
npm start -- --long-video
```

### High Quality Mode
More comprehensive summaries by processing more content (up to 500K characters)

```
npm start -- --high-quality
```

### Sampling Method Options
When using `--long-video`, you can specify how the transcript is sampled:

- `--sample-intelligent` (default): Takes 6 strategically placed samples throughout the video
- `--sample-uniform`: Takes equal samples from beginning, middle, and end
- `--sample-bookend`: Focuses more on beginning and end where key info often appears

Example:
```
npm start -- --long-video --sample-bookend
```

## How It Works

1. **Fetch & Validate**: Gets the YouTube transcript and verifies it
2. **Chunk**: Divides the transcript into manageable pieces
3. **Map**: Summarizes each chunk in parallel (with rate limiting)
4. **Reduce**: Combines chunk summaries into a cohesive final summary
5. **Format**: Applies Markdown formatting for readability

## API Rate Limiting

The tool respects Gemini API free tier limits:
- 15 requests per minute
- 1,000,000 tokens per minute
- 1,500 requests per day

For long videos, processing automatically throttles to stay within these limits.

## License

MIT 