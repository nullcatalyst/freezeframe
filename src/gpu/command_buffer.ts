import { deepCopy } from "../util/deep_copy";
import { FFCommandEncoder } from "./command_encoder";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFCommandBuffer extends FFObject<GPUCommandBuffer> {
    private _cmd: FFCommandEncoder;
    private _desc?: GPUCommandBufferDescriptor;

    get typeName(): string {
        return 'commandBuffer';
    }

    constructor(rcd: FFRecorder, commandBuffer: GPUCommandBuffer, cmd: FFCommandEncoder, desc?: GPUCommandBufferDescriptor) {
        super(rcd, commandBuffer);
        this._cmd = cmd;
        this._desc = deepCopy(desc);
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._cmd.markUsed();
    }
}
