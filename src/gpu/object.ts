import { FFRecorder } from "./recorder";

export interface FFKey<T> {
    $ff?: FFObject<T>;
}

/** Base recorded object */
export abstract class FFObject<T> {
    protected _id: number;
    protected _actual: T;
    protected _used = false;

    constructor(rcd: FFRecorder, actual: T) {
        if ((actual as FFKey<T>).$ff != null) {
            throw new Error('object already wrapped');
        }

        (actual as FFKey<T>).$ff = this;
        this._actual = actual;

        if (rcd != null) {
            this._id = rcd.nextId(this.constructor);
            rcd.addObject(this);
        } else {
            this._id = 0;
        }
    }

    abstract get typeName(): string;
    get actual(): T {
        return this._actual;
    }

    get name(): string {
        return `${this.typeName}${this._id}`;
    }

    get used(): boolean {
        return this._used;
    }

    markUsed() {
        this._used = true;
    }

    resetUsed() {
        this._used = false;
    }

    cacheCurrentContents() {
        // Do nothing.
        // The idea is to save the contents of buffers and textures so that the frame can be
        // recreated before the recorded frames are played.
    }

    addInitActions(rcd: FFRecorder) {
        // Do nothing.
    }
}
