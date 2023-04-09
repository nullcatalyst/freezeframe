import { FFRecorder } from "./recorder";
import { FFObject } from "./object";
import { assignment, propertyAssignment, statement } from "./actions";

export class FFCanvas extends FFObject<HTMLCanvasElement> {
    _width: number;
    _height: number;
    _styleWidth: number;
    _styleHeight: number;

    get typeName(): string {
        return 'canvas';
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();

        this._width = this._actual.width;
        this._height = this._actual.height;

        const bounds = this._actual.getBoundingClientRect();
        this._styleWidth = bounds.width;
        this._styleHeight = bounds.height;
    }

    addInitActions(rcd: FFRecorder) {
        rcd.addInitAction(assignment(this, `document.createElement('canvas')`));
        rcd.addInitAction(propertyAssignment(this, 'width', this._width));
        rcd.addInitAction(propertyAssignment(this, 'height', this._height));
        rcd.addInitAction(propertyAssignment(this, 'style.width', `"${this._styleWidth}px"`));
        rcd.addInitAction(propertyAssignment(this, 'style.height', `"${this._styleHeight}px"`));
        rcd.addInitAction(statement(`document.body.appendChild(${this.name})`));
    }
}
