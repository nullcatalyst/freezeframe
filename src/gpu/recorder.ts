import { downloadFile } from "../util/download";
import { FFObject } from "./object";
import { FFTextureView } from "./texture_view";

export class FFRecorder {
    private readonly _nextIdMap = new Map<Function, number>();
    private _recording: boolean = false;
    private _liveObjects: Set<FFObject<any>> = new Set();
    private _initActions: string[] = [];
    private _frameActions: string[] = [];

    get recording(): boolean { return this._recording; }

    startRecording() {
        for (const object of this._liveObjects) {
            object.resetUsed();
            object.cacheCurrentContents();
        }

        this._recording = true;
        window.requestAnimationFrame(() => this.stopRecording());
    }

    stopRecording() {
        this._recording = false;
        this.save();
    }

    async save() {
        const declVars = [];
        const textures = [];
        for (const object of this._liveObjects) {
            if (object.used) {
                declVars.push(`${object.name}`);
                await object.addInitActions(this);

                if (object instanceof FFTextureView) {
                    textures.push(object);
                }
            }
        }

        const lines = [
            '<!doctype html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8">',
            '<title>Recorded</title>',
            '</head>',
            '',
            '<body>',
            '<select id="targets" >',
            ...textures.map((t, i) => `    <option value="${i}"${i === textures.length }>${t.name}</option>`),
            '</select>',
            '<br/>',
            '<script>',
            '(async () => {',
            'let _blit_target = 0;',
            'const select = document.getElementById("targets");',
            'select.addEventListener("change", ev => {_blit_target = +ev.target.value;});',
            '',
            // 'const _blit_wgsl = "@group(0)@binding(0)var image:texture_2d<f32>;@group(0)@binding(1)var nearest:sampler;struct Varyings{@builtin(position)position:vec4<f32>,@location(0)coord:vec2<f32>};@vertex fn vs_main(@builtin(vertex_index)i:u32)->Varyings{var positions:array<vec4<f32>,4>=array<vec4<f32>,4>(vec4<f32>(-1.0,-1.0,0.0,1.0),vec4<f32>(1.0,-1.0,0.0,1.0),vec4<f32>(-1.0,1.0,0.0,1.0),vec4<f32>(1.0,1.0,0.0,1.0));var coords:array<vec2<f32>,4>=array<vec2<f32>,4>(vec2<f32>(0.0,1.0),vec2<f32>(1.0,1.0),vec2<f32>(0.0,0.0),vec2<f32>(1.0,0.0));var o:Varyings;o.position=positions[i];o.coord=coords[i];return o;}@fragment fn fs_main(v:Varyings)->@location(0)vec4<f32>{return textureSample(image,nearest,v.coord);}";',
            'const _blit_wgsl = "@group(0)@binding(0)var image:texture_2d<f32>;struct Varyings{@builtin(position)position:vec4<f32>,@location(0)coord:vec2<f32>};@vertex fn vs_main(@builtin(vertex_index)i:u32)->Varyings{var positions:array<vec4<f32>,4>=array<vec4<f32>,4>(vec4<f32>(-1.0,-1.0,0.0,1.0),vec4<f32>(1.0,-1.0,0.0,1.0),vec4<f32>(-1.0,1.0,0.0,1.0),vec4<f32>(1.0,1.0,0.0,1.0));var coords:array<vec2<f32>,4>=array<vec2<f32>,4>(vec2<f32>(0.0,1.0),vec2<f32>(1.0,1.0),vec2<f32>(0.0,0.0),vec2<f32>(1.0,0.0));var o:Varyings;o.position=positions[i];o.coord=coords[i];return o;}@fragment fn fs_main(v:Varyings)->@location(0)vec4<f32>{return textureLoad(image,vec2<i32>(v.position.xy), 0);}";',
            'let _blit_canvas, _blit_canvasContext, _blit_renderPipeline, _blit_bindGroup;',
            '',
            'function b64(base64) {',
            '    const binaryString = atob(base64);',
            '    const bytes = new Uint8Array(binaryString.length);',
            '    for (let i = 0; i < binaryString.length; ++i) {',
            '        bytes[i] = binaryString.charCodeAt(i);',
            '    }',
            '    return bytes.buffer;',
            '}',
            '',
            'function _blit_frame(_blit_w, _blit_h, _blit_bindGroup) {',
            '    if (_blit_canvas.width !== _blit_w || _blit_canvas.height !== _blit_h) {',
            '        _blit_canvas.width = _blit_w;',
            '        _blit_canvas.height = _blit_h;',
            '    }',
            '',
            '    let _blit_texture = _blit_canvasContext.getCurrentTexture();',
            '    let _blit_textureView = _blit_texture.createView();',
            '    let _blit_commandEncoder = device0.createCommandEncoder();',
            '    let _blit_renderPassEncoder = _blit_commandEncoder.beginRenderPass({colorAttachments: [{view: _blit_textureView, loadOp: "clear", storeOp: "store", clearValue: [0, 0, 0, 0]}]});',
            '    _blit_renderPassEncoder.setViewport(0, 0, _blit_w, _blit_h, 0, 1);',
            '    _blit_renderPassEncoder.setScissorRect(0, 0, _blit_w, _blit_h);',
            '    _blit_renderPassEncoder.setPipeline(_blit_renderPipeline);',
            '    _blit_renderPassEncoder.setBindGroup(0, _blit_bindGroup);',
            '    _blit_renderPassEncoder.draw(4, 1);',
            '    _blit_renderPassEncoder.end();',
            '    queue0.submit([_blit_commandEncoder.finish()]);',
            '}',
            '',
        ];

        if (declVars.length > 0) {
            lines.push(`let ${declVars.join(', ')};`);
        }

        if (textures.length > 0) {
            lines.push(`let ${textures.map(t => `_blit_bindGroup_${t.name}`).join(', ')};`)
        }

        const unfilterable = (t: FFTextureView) => (t as any)._texture._desc.format.startsWith('depth') ? '_unfilterable' : ''

        lines.push(
            '',
            'async function init() {',
            ...this._initActions.map(s => `    ${s}`),
            '',
            '    _blit_canvas = document.createElement("canvas");',
            '    document.body.appendChild(_blit_canvas);',
            '    _blit_canvasContext = _blit_canvas.getContext("webgpu");',
            '    _blit_canvasContext.configure({device: device0, format: "bgra8unorm"});',
            // '    let _blit_sampler = device0.createSampler();',
            '    _blit_bindGroupLayout = device0.createBindGroupLayout({',
            '        entries: [',
            '            {binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: "unfilterable-float", viewDimension: "2d", multisampled: 0}},',
            // '            {binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {type: "non-filtering"}},',
            '        ],',
            '    });',
            '    _blit_shaderModule = device0.createShaderModule({code: _blit_wgsl});',
            '    _blit_pipelineLayout = device0.createPipelineLayout({bindGroupLayouts: [_blit_bindGroupLayout]});',
            '    _blit_renderPipeline = device0.createRenderPipeline({layout: _blit_pipelineLayout, vertex: {module: _blit_shaderModule, entryPoint: "vs_main", buffers: []}, primitive: {topology: "triangle-strip", frontFace: "ccw", cullMode: "none"}, fragment: {module: _blit_shaderModule, entryPoint: "fs_main", targets: [{format: "bgra8unorm"}]}});',
            '',
            ...textures.map(t => `    _blit_bindGroup_${t.name} = device0.createBindGroup({layout: _blit_bindGroupLayout, entries: [{binding: 0, resource: ${t.name}}]});`),
            // ...textures.map(t => `    _blit_bindGroup_${t.name} = device0.createBindGroup({layout: _blit_bindGroupLayout, entries: [{binding: 0, resource: ${t.name}}, {binding: 1, resource: _blit_sampler}]});`),
            '}',
            '',
            'const _blit_renderFrame = [',
            ...textures.map(t => `    () => _blit_frame(${(t as any)._texture._desc.size.width}, ${(t as any)._texture._desc.size.height}, _blit_bindGroup_${t.name}),`),
            '];',
            '_blit_target = _blit_renderFrame.length - 1;',
            '',
            'function frame() {',
            ...this._frameActions.map(s => `    ${s}`),
            '',
            '    _blit_renderFrame[_blit_target]();',
            '',
            '    requestAnimationFrame(frame);',
            '}',
            '',

            'await init();',
            'requestAnimationFrame(frame);',
            '',
            '})();',
            '</script>',
            '</body>',
        );
        const output = lines.join('\n');

        downloadFile('recorded.html', output);
        this.clearActions();
    }

    ////////////////////////////////

    nextId(type: Function): number {
        const id = this._nextIdMap.get(type) || 0;
        this._nextIdMap.set(type, id + 1);
        return id;
    }

    addObject(object: FFObject<any>) {
        this._liveObjects.add(object);
    }

    removeObject(object: FFObject<any>) {
        this._liveObjects.delete(object);
    }

    addInitAction(action: string) {
        this._initActions.push(action);
    }

    addFrameAction(action: string) {
        this._frameActions.push(action);
    }

    clearActions() {
        this._initActions.length = 0;
        this._frameActions.length = 0;
    }
}
