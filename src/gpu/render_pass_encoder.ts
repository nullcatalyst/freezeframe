import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFCommandEncoder } from "./command_encoder";
import { FFKey, FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFRenderPassEncoder extends FFObject<GPURenderPassEncoder> {
    private _commandEncoder: FFCommandEncoder;
    private _desc?: GPURenderPassDescriptor;

    get typeName(): string {
        return 'renderPassEncoder';
    }

    constructor(rcd: FFRecorder, renderPassEncoder: GPURenderPassEncoder, commandEncoder: FFCommandEncoder, desc?: GPURenderPassDescriptor) {
        super(rcd, renderPassEncoder);
        this._commandEncoder = commandEncoder;
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

        const old_setBindGroup = renderPassEncoder.setBindGroup;
        renderPassEncoder.setBindGroup = (index: number, bindGroup: GPUBindGroup, ...args: [Iterable<number>?] | [Uint32Array, number, number]) => {
            if (rcd.recording) {
                (bindGroup as any as FFKey<GPUBindGroup>).$ff.markUsed();
                rcd.addFrameAction(methodCall(this, 'setBindGroup', [index, bindGroup, ...args]));
            }
            // TODO: This typecast to a tuple is not exactly correct, but it removes the compile
            // error.
            return old_setBindGroup.call(renderPassEncoder, index, bindGroup, ...(args as [Uint32Array, number, number]));
        };

        const old_setPipeline = renderPassEncoder.setPipeline;
        renderPassEncoder.setPipeline = (pipeline: GPURenderPipeline) => {
            if (rcd.recording) {
                (pipeline as any as FFKey<GPURenderPipeline>).$ff.markUsed();
                rcd.addFrameAction(methodCall(this, 'setPipeline', [pipeline]));
            }
            return old_setPipeline.call(renderPassEncoder, pipeline);
        };

        const old_setVertexBuffer = renderPassEncoder.setVertexBuffer;
        renderPassEncoder.setVertexBuffer = (slot: number, buffer: GPUBuffer, offset?: number, size?: number) => {
            if (rcd.recording) {
                (buffer as any as FFKey<GPUBuffer>).$ff.markUsed();
                rcd.addFrameAction(methodCall(this, 'setVertexBuffer', [slot, buffer, offset, size]));
            }
            return old_setVertexBuffer.call(renderPassEncoder, slot, buffer, offset, size);
        };

        const old_setIndexBuffer = renderPassEncoder.setIndexBuffer;
        renderPassEncoder.setIndexBuffer = (buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: number, size?: number) => {
            if (rcd.recording) {
                (buffer as any as FFKey<GPUBuffer>).$ff.markUsed();
                rcd.addFrameAction(methodCall(this, 'setIndexBuffer', [buffer, indexFormat, offset, size]));
            }
            return old_setIndexBuffer.call(renderPassEncoder, buffer, indexFormat, offset, size);
        };

        const old_draw = renderPassEncoder.draw;
        renderPassEncoder.draw = (vertexCount: number, instanceCount: number, firstVertex: number, firstInstance: number) => {
            if (rcd.recording) {
                rcd.addFrameAction(methodCall(this, 'draw', [vertexCount, instanceCount, firstVertex, firstInstance]));
            }
            return old_draw.call(renderPassEncoder, vertexCount, instanceCount, firstVertex, firstInstance);
        };

        const old_drawIndexed = renderPassEncoder.drawIndexed;
        renderPassEncoder.drawIndexed = (indexCount: number, instanceCount: number, firstIndex: number, baseVertex: number, firstInstance: number) => {
            if (rcd.recording) {
                rcd.addFrameAction(methodCall(this, 'drawIndexed', [indexCount, instanceCount, firstIndex, baseVertex, firstInstance]));
            }
            return old_drawIndexed.call(renderPassEncoder, indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
        };

        const old_end = renderPassEncoder.end;
        renderPassEncoder.end = () => {
            if (rcd.recording) {
                rcd.addFrameAction(methodCall(this, 'end', []));
            }
            return old_end.call(renderPassEncoder);
        };
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._commandEncoder.markUsed();

        if (this._desc && this._desc.colorAttachments) {
            for (const colorAttachment of this._desc.colorAttachments) {
                if (colorAttachment != null && colorAttachment.view) {
                    (colorAttachment.view as any as FFKey<GPUTextureView>).$ff.markUsed();
                }
            }
        }

        if (this._desc && this._desc.depthStencilAttachment) {
            if (this._desc.depthStencilAttachment.view) {
                (this._desc.depthStencilAttachment.view as any as FFKey<GPUTextureView>).$ff.markUsed();
            }
        }
    }
}
