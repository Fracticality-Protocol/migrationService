import { WebClient } from '@slack/web-api'

export class Slack {
  private static instance: Slack
  private service: string
  private client: WebClient
  private channelId: string
  private console: typeof console

  private messageQueue: { level: 'info' | 'warn' | 'error'; args: any[] }[] = []
  private isProcessingQueue = false

  private constructor(token: string, channelId: string) {
    this.service = 'migration-service'
    this.client = new WebClient(token)
    this.channelId = channelId
    this.console = { ...console }
    this.hookConsole()
  }

  static initialize(token: string, channelId: string): Slack {
    console.log('Initializing Slack hook...')
    if (!Slack.instance) {
      Slack.instance = new Slack(token, channelId)
    }
    return Slack.instance
  }

  static getInstance(): Slack {
    if (!Slack.instance) {
      throw new Error('Slack not initialized. Call Slack.initialize first')
    }
    return Slack.instance
  }

  private hookConsole() {
    console.info = (...args) => {
      this.console.info(...args)
      this.enqueueMessage('info', args)
    }

    console.warn = (...args) => {
      this.console.warn(...args)
      this.enqueueMessage('warn', args)
    }

    console.error = (...args) => {
      this.console.error(...args)
      this.enqueueMessage('error', args)
    }
  }

  private getMessagePrefix(): string {
    return `[${this.service}] [${new Date().toISOString()}]`
  }

  private enqueueMessage(level: 'info' | 'warn' | 'error', args: any[]) {
    this.messageQueue.push({ level, args })
    void this.processQueue()
  }

  private async processQueue() {
    if (this.isProcessingQueue) return

    this.isProcessingQueue = true
    while (this.messageQueue.length > 0) {
      const { level, args } = this.messageQueue.shift()!
      const prefix = this.getMessagePrefix()
      const formattedArgs = [prefix, ...args]

      try {
        switch (level) {
          case 'info':
            await this.sendMessage(`ℹ️ \`INFO\`\n\`\`\`${formattedArgs.join(' ')}\`\`\``)
            break
          case 'warn':
            await this.sendMessage(`⚠️ \`WARN\`\n\`\`\`${formattedArgs.join(' ')}\`\`\``)
            break
          case 'error':
            await this.sendMessage(`🚨 \`ERROR\`\n\`\`\`${formattedArgs.join(' ')}\`\`\``)
            break
        }
      } catch (error) {
        this.console.error('Error sending message to Slack:', error)
      }
    }
    this.isProcessingQueue = false
  }

  async sendMessage(message: string) {
    try {
      await this.client.chat.postMessage({
        channel: this.channelId,
        text: message
      })
    } catch (error) {
      this.console.error('Error sending message to Slack:', error)
    }
  }
}
