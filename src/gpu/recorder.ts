import { FFObject } from "./object";

export class FFRecorder {
    private readonly _nextIdMap = new Map<Function, number>();
    private _recording: boolean = false;
    private _liveObjects: Set<FFObject<any>> = new Set();
    private _initActions: string[] = [];
    private _frameActions: string[] = [];

    get recording(): boolean { return this._recording; }

    startRecording() {
        for (let object of this._liveObjects) {
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

    async save(): Promise<string> {
        const declVars = [];
        for (let object of this._liveObjects) {
            if (object.used) {
                declVars.push(`let ${object.name} = null;`);
                await object.addInitActions(this);
            }
        }

        const lines = [
            '<!doctype html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8">',
            '<title>Recorded</title>',
            '</head>',
            '<body>',
            '<script>',
            '(async () => {',
            ...declVars,

            'async function init() {',
            ...this._initActions,
            '}',
            'function frame() {',
            ...this._frameActions,
            'requestAnimationFrame(frame);',
            '}',

            'await init();',
            // 'frame();',
            'requestAnimationFrame(frame);',
            '})();',
            '</script>',
            '</body>',
        ];
        const output = lines.join('\n');
        console.log(output);

        this.clearActions();
        return output;
    }

    ////////////////////////////////

    nextId(type: Function): number {
        let id = this._nextIdMap.get(type) || 0;
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
