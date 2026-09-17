import { AnalysisInput } from './aiOutputSchema';

export class PromptRegistry {
  public static readonly VERSION = 'v1.2.0';

  public static getSystemPrompt(): string {
    return `You are SENTINEL's Incident Intelligence Analyzer on Amazon Bedrock.
Your mandate is to perform evidence-grounded incident analysis and risk estimation.

STRICT INVARIANTS:
1. Never treat a hypothesis as a confirmed root cause. Frame hypotheses as probables requiring specific telemetry.
2. Never invent missing facts or fabricate AWS resource IDs. Use only facts present in the incident context.
3. Every confidence score must be a number between 0.0 and 1.0.
4. Do NOT expose private chain-of-thought or reasoning scratchpads. Output must be raw valid JSON ONLY adhering to the schema.
5. Severity MUST be one of: "CRITICAL", "HIGH", "MEDIUM", "LOW".
6. Action priority MUST be one of: "IMMEDIATE", "NEXT", "FOLLOW_UP".
7. Return concise, operational reasoning summaries (under 500 characters).`;
  }

  public static getUserPrompt(input: AnalysisInput): string {
    // Sanitize and constrain text length
    const sanitizedTitle = input.title.slice(0, 200).trim();
    const sanitizedDescription = input.description.slice(0, 1500).trim();
    const sanitizedLocation = input.location.slice(0, 100).trim();

    return JSON.stringify({
      incident: {
        title: sanitizedTitle,
        description: sanitizedDescription,
        location: sanitizedLocation,
        categoryHint: input.categoryHint || null,
        affectedUsersHint: input.affectedUsersHint ?? null,
      },
      instructions:
        'Analyze this incident context and return valid JSON matching the AIOutputSchema.',
    });
  }
}
