import { Req, Res, WorkerMessage } from "./protocol";

export class RPC {
  private pending = new Map<string, { resolve: (res: Res) => void; reject: (err: any) => void }>();

  constructor(private worker: Worker) {
    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const { id, res } = event.data;
      const promise = this.pending.get(id);
      if (promise && res) {
        this.pending.delete(id);
        if (res.type === "error") {
          promise.reject(new Error(res.error.message));
        } else {
          promise.resolve(res);
        }
      }
    };
  }

  request(req: Req): Promise<Res> {
    const id = Math.random().toString(36).slice(2);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, req });
    });
  }
}
