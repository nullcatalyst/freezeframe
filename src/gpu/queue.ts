import { assignment, methodCall } from "./actions";
import { FFDevice } from "./device";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFQueue extends FFObject<GPUQueue> {
    private _device: FFDevice;

    get typeName(): string {
        return 'queue';
    }

    constructor(rcd: FFRecorder, queue: GPUQueue, device: FFDevice) {
        super(rcd, queue);
        this._device = device;

        const old_submit = queue.submit;
        queue.submit = (commandBuffers: GPUCommandBuffer[]) => {
            if (rcd.recording) {
                this.markUsed();
                commandBuffers.forEach((cmdBuf) => {
                    (cmdBuf as any).$ff.markUsed();
                });
                rcd.addFrameAction(methodCall(this, 'submit', [commandBuffers]));
            } else {
                commandBuffers.forEach((cmdBuf) => {
                    rcd.removeObject((cmdBuf as any).$ff);
                });
            }
            return old_submit.call(queue, commandBuffers);
        }
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._device.markUsed();
    }

    addInitActions(rcd: FFRecorder): void {
        rcd.addInitAction(assignment(this, `${this._device.name}.queue`));
    }
}
