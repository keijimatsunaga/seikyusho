export type EmailInput = { to: string; subject: string; text: string };
export type EmailResult = { messageId?: string };

export interface EmailProvider {
  send(input: EmailInput): Promise<EmailResult>;
}

export class StubEmailProvider implements EmailProvider {
  async send(input: EmailInput): Promise<EmailResult> {
    console.info('[email:stub]', { to: input.to, subject: input.subject });
    return { messageId: `stub-${Date.now()}` };
  }
}
