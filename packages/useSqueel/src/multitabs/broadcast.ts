export class Broadcaster {
  private channel: BroadcastChannel | null = null;

  constructor(channelName: string, onMessage: (tables: string[]) => void) {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = (event) => {
        onMessage(event.data.tables);
      };
    }
  }

  broadcast(tables: string[]) {
    this.channel?.postMessage({ tables, ts: Date.now() });
  }

  close() {
    this.channel?.close();
  }
}
