import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFDevice } from "./device";
import { FFObject } from "./object";
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
        this._mappedState = this.actual.mapState;

        const untouchedDevice = GPUDevice.prototype;
        const device = this._device.actual;
        this._cachedBuffer = untouchedDevice.createBuffer.call(device, {
            size: this._desc.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const cmd = untouchedDevice.createCommandEncoder.call(device);
        cmd.copyBufferToBuffer(this.actual, 0, this._cachedBuffer, 0, this._desc.size);
        (GPUDevice.prototype as any).__lookupGetter__('queue').call(device).submit([cmd.finish()]);
    }

    async addInitActions(rcd: FFRecorder) {
        await this._cachedBuffer.mapAsync(GPUMapMode.READ);
        const data = this._cachedBuffer.getMappedRange();

        rcd.addInitAction(methodCall(this._device, 'createBuffer', [{
            size: this._desc.size,
            usage: this._desc.usage,
            mappedAtCreation: (this._desc.usage & GPUBufferUsage.MAP_WRITE) !== 0,
        }]));

        if (this._desc.usage & GPUBufferUsage.COPY_DST) {
            rcd.addInitAction(`{`);
            rcd.addInitAction(`const tmpBuffer = ${this._device.name}.createBuffer({"size":${this._desc.size},"usage":GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_WRITE,"mappedAtCreation":true})`);
            rcd.addInitAction(`const tmpData = tmpBuffer.getMappedRange()`);
            rcd.addInitAction(`new Uint8Array(tmpData).set(new Uint8Array([${Array.from(new Uint8Array(data))}]))`);
            rcd.addInitAction(`tmpBuffer.unmap()`);
            rcd.addInitAction(`const tmpCmd = ${this._device.name}.createCommandEncoder()`);
            rcd.addInitAction(`tmpCmd.copyBufferToBuffer(tmpBuffer, 0, ${this.name}, 0, ${this._desc.size})`);
            rcd.addInitAction(`${this._device.name}.queue.submit([tmpCmd.finish()])`);
            rcd.addInitAction(`}`);
        } else {
            rcd.addInitAction(`{`);
            rcd.addInitAction(`const tmpData = tmpBuffer.getMappedRange()`);
            rcd.addInitAction(`new Uint8Array(tmpData).set(new Uint8Array([${Array.from(new Uint8Array(data))}]))`);

            if (this._mappedState !== 'mapped') {
                rcd.addInitAction(`tmpBuffer.unmap()`);
            }

            rcd.addInitAction(`const tmpCmd = ${this._device.name}.createCommandEncoder()`);
            rcd.addInitAction(`tmpCmd.copyBufferToBuffer(tmpBuffer, 0, ${this.name}, 0, ${this._desc.size})`);
            rcd.addInitAction(`${this._device.name}.queue.submit([tmpCmd.finish()])`);
            rcd.addInitAction(`}`);
        }

        this._cachedBuffer.unmap();
    }
}
