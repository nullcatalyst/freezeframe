import { encode } from "../util/base64";
import { deepCopy } from "../util/deep_copy";
import { methodCall, statement } from "./actions";
import { FFDevice } from "./device";
import { FFKey, FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFBuffer extends FFObject<GPUBuffer> {
    private _device: FFDevice;
    private _desc?: GPUBufferDescriptor;
    private _cachedBuffer?: GPUBuffer;
    private _mappedState?: GPUBufferMapState;

    get typeName(): string {
        return 'buffer';
    }

    constructor(rcd: FFRecorder, buffer: GPUBuffer, device: FFDevice, desc?: GPUBufferDescriptor) {
        super(rcd, buffer);
        this._device = device;
        this._desc = deepCopy(desc);

        const old_destroy = buffer.destroy;
        buffer.destroy = () => {
            if (rcd.recording) {
                rcd.addFrameAction(methodCall(this, 'destroy', []));
            } else {
                rcd.removeObject(this);
            }
            return old_destroy.call(buffer);
        }
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._device.markUsed();
    }

    cacheCurrentContents() {
        const size = this._desc!.size;
        this._mappedState = this.actual.mapState;

        const devicePrototype = GPUDevice.prototype;
        const device = this._device.actual;
        this._cachedBuffer = devicePrototype.createBuffer.call(device, {
            "size": size,
            "usage": GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const cmd = devicePrototype.createCommandEncoder.call(device);
        cmd.copyBufferToBuffer(this.actual, 0, this._cachedBuffer, 0, size);
        (devicePrototype as any).__lookupGetter__('queue').call(device).submit([cmd.finish()]);
    }

    async addInitActions(rcd: FFRecorder) {
        const desc = this._desc!;
        const cachedBuffer = this._cachedBuffer!;

        await cachedBuffer.mapAsync(GPUMapMode.READ);
        const data = cachedBuffer.getMappedRange();

        rcd.addInitAction(methodCall(this._device, 'createBuffer', [{
            size: desc.size,
            usage: desc.usage | GPUBufferUsage.COPY_DST,
            mappedAtCreation: this._mappedState === 'mapped',
        }], this));

        rcd.addInitAction(statement(`${(this._device.actual.queue as any as FFKey<GPUQueue>).$ff.name}.writeBuffer(${this.name}, 0, b64("${encode(data)}"))`));

        cachedBuffer.unmap();
    }
}
