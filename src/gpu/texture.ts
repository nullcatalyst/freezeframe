import { encode } from "../util/base64";
import { deepCopy } from "../util/deep_copy";
import { methodCall, statement } from "./actions";
import { FFDevice } from "./device";
import { FFKey, FFObject } from "./object";
import { FFRecorder } from "./recorder";
import { FFTextureView } from "./texture_view";

const bytesPerPixelForFormat: { [format in GPUTextureFormat]?: number } = {
    'r8unorm': 1,
    'r8snorm': 1,
    'r8uint': 1,
    'r8sint': 1,
    'r16uint': 2,
    'r16sint': 2,
    'r16float': 2,
    'rg8unorm': 2,
    'rg8snorm': 2,
    'rg8uint': 2,
    'rg8sint': 2,
    'r32uint': 4,
    'r32sint': 4,
    'r32float': 4,
    'rg16uint': 4,
    'rg16sint': 4,
    'rg16float': 4,
    'rgba8unorm': 4,
    'rgba8unorm-srgb': 4,
    'bgra8unorm': 4,
    'bgra8unorm-srgb': 4,
    'rgba8snorm': 4,
    'rgba8uint': 4,
    'rgba8sint': 4,
    'rgb10a2unorm': 4,
    'rg11b10ufloat': 4,
    'rg32uint': 8,
    'rg32sint': 8,
    'rg32float': 8,
    'rgba16uint': 8,
    'rgba16sint': 8,
    'rgba16float': 8,
    'rgba32uint': 16,
    'rgba32sint': 16,
    'rgba32float': 16,
    'depth32float': 4,
    'depth24plus': 4,
    'depth24plus-stencil8': 4,
    'stencil8': 1,
};

export class FFTexture extends FFObject<GPUTexture> {
    private _device: FFDevice;
    private _desc: GPUTextureDescriptor;
    private _cachedBuffer?: GPUBuffer;
    private _loadPreviousContents?: boolean;

    get typeName(): string {
        return 'texture';
    }

    constructor(rcd: FFRecorder, texture: GPUTexture, device: FFDevice, desc: GPUTextureDescriptor) {
        super(rcd, texture);
        this._device = device;
        this._desc = deepCopy(desc);

        const old_createView = texture.createView;
        texture.createView = (desc?: GPUTextureViewDescriptor) => {
            const texView = old_createView.call(texture, desc);
            new FFTextureView(rcd, texView, this, desc);
            return texView;
        };

        const old_destroy = texture.destroy;
        texture.destroy = () => {
            if (rcd.recording) {
                rcd.addInitAction(methodCall(this, 'destroy', []));
            }
            return old_destroy.call(texture);
        }
    }

    setLoadPreviousContents(loadPreviousContents: boolean): void {
        if (this._loadPreviousContents != null) {
            return;
        }
        this._loadPreviousContents = loadPreviousContents;
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._device.markUsed();
    }

    cacheCurrentContents() {
        if ((this._loadPreviousContents != null && !this._loadPreviousContents) || this._desc.format.startsWith('depth') || this._desc.format.startsWith('stencil')) {
            return;
        }

        const { w, h, b } = textureSizeFromDesc(this._desc);

        const untouchedDevice = GPUDevice.prototype;
        const device = this._device.actual;
        this._cachedBuffer = untouchedDevice.createBuffer.call(device, {
            "size": w * h * b,
            "usage": GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const cmd: GPUCommandEncoder = untouchedDevice.createCommandEncoder.call(device);
        cmd.copyTextureToBuffer({
            "texture": this.actual,
        }, {
            "buffer": this._cachedBuffer,
            "bytesPerRow": w * b,
            "rowsPerImage": h,
        }, {
            "width": w,
            "height": h,
            "depthOrArrayLayers": 1,
        });
        (GPUDevice.prototype as any).__lookupGetter__('queue').call(device).submit([cmd.finish()]);
    }

    async addInitActions(rcd: FFRecorder) {
        if ((this._loadPreviousContents != null && !this._loadPreviousContents) ||this._desc.format.startsWith('depth') || this._desc.format.startsWith('stencil')) {
            const customDesc = deepCopy(this._desc);
            customDesc.usage |= GPUTextureUsage.TEXTURE_BINDING;
            rcd.addInitAction(methodCall(this._device, 'createTexture', [customDesc], this));
            return;
        }

        await this._cachedBuffer!.mapAsync(GPUMapMode.READ);
        const data = this._cachedBuffer!.getMappedRange();

        const tmpDesc = deepCopy(this._desc);
        tmpDesc.usage |= GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING;

        const { w, h, d, b } = textureSizeFromDesc(this._desc);
        if (d > 1) {
            throw new Error('texture arrays and 3D textures are not supported');
        }

        const imageLayout = {
            "bytesPerRow": w * b,
            "rowsPerImage": h,
        };
        const imageSize = {
            "width": w,
            "height": h,
            "depthOrArrayLayers": 1,
        };

        rcd.addInitAction(methodCall(this._device, 'createTexture', [tmpDesc], this));

        const imageParams = `${JSON.stringify(imageLayout)}, ${JSON.stringify(imageSize)}`;
        rcd.addInitAction(statement(`${(this._device.actual.queue as any as FFKey<GPUQueue>).$ff.name}.writeTexture({"texture": ${this.name}, "aspect": "all"}, b64("${encode(data)}"), ${imageParams})`));

        this._cachedBuffer!.unmap();
    }
}

interface TextureSize {
    w: number;  // width
    h: number;  // height
    d: number;  // depth or array layers
    b: number;  // bytes per pixel
}

function textureSizeFromDesc(desc: GPUTextureDescriptor): TextureSize {
    const b = bytesPerPixelForFormat[desc.format];
    if (b == null) {
        throw new Error('unknown or unsupported texture format');
    }

    let w = 1;
    let h = 1;
    let d = 1;
    const size = desc.size;
    if (Array.isArray(size)) {
        w = size[0] || 1;
        h = size[1] || 1;
        d = size[2] || 1;
    } else if (typeof size === 'object') {
        w = (size as GPUExtent3DDictStrict).width || 1;
        h = (size as GPUExtent3DDictStrict).height || 1;
        d = (size as GPUExtent3DDictStrict).depthOrArrayLayers || 1;
    } else {
        throw new Error('unknown texture size');
    }

    return { w, h, d, b };
}
