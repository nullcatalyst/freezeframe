import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFCommandEncoder } from "./command_encoder";
import { FFKey, FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFRenderPassEncoder extends FFObject<GPURenderPassEncoder> {
    private _cmd: FFCommandEncoder;
    private _desc?: GPURenderPassDescriptor;

    get typeName(): string {
        return 'renderPass';
    }

    constructor(rcd: FFRecorder, renderPassEncoder: GPURenderPassEncoder, cmd: FFCommandEncoder, desc?: GPURenderPassDescriptor) {
        super(rcd, renderPassEncoder);
        this._cmd = cmd;
        this._desc = deepCopy(desc);

        const old_setViewport = renderPassEncoder.setViewport;
        renderPassEncoder.setViewport = (x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number) => {
            if (rcd.recording) {
                rcd.addFrameAction(methodCall(this, 'setViewport', [x, y, width, height, minDepth, maxDepth]));
            }
            return old_setViewport.call(renderPassEncoder, x, y, width, height, minDepth, maxDepth);
        };

        const old_setScissorRect = renderPassEncoder.setScissorRect;
        renderPassEncoder.setScissorRect = (x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate) => {
            if (rcd.recording) {
                rcd.addFrameAction(methodCall(this, 'setScissorRect', [x, y, width, height]));
            }
            return old_setScissorRect.call(renderPassEncoder, x, y, width, height);
        };

        const old_setPipeline = renderPassEncoder.setPipeline;
        renderPassEncoder.setPipeline = (pipeline: GPURenderPipeline) => {
            if (rcd.recording) {
                (pipeline as any as FFKey<GPURenderPipeline>).$ff.markUsed();
                rcd.addFrameAction(methodCall(this, 'setPipeline', [pipeline]));
            }
            return old_setPipeline.call(renderPassEncoder, pipeline);
        };

        const old_draw = renderPassEncoder.draw;
        renderPassEncoder.draw = (vertexCount: number, instanceCount: number, firstVertex: number, firstInstance: number) => {
            if (rcd.recording) {
                rcd.addFrameAction(methodCall(this, 'draw', [vertexCount, instanceCount, firstVertex, firstInstance]));
            }
            return old_draw.call(renderPassEncoder, vertexCount, instanceCount, firstVertex, firstInstance);
        }

        const old_end = renderPassEncoder.end;
        renderPassEncoder.end = () => {
            if (rcd.recording) {
                rcd.addFrameAction(methodCall(this, 'end', []));
            }
            return old_end.call(renderPassEncoder);
        }
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._cmd.markUsed();

        if (this._desc && this._desc.colorAttachments) {
            for (const colorAttachment of this._desc.colorAttachments) {
                if (colorAttachment.view) {
                    (colorAttachment.view as any as FFKey<GPUTextureView>).$ff.markUsed();
                }
            }
        }
    }
}
