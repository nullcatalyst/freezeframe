import { assignment } from "./actions";
import { FFAdapter } from "./adapter";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFNavGpu extends FFObject<GPU> {
    get typeName(): string {
        return 'navGpu';
    }

    constructor(rcd: FFRecorder, navGpu: GPU) {
        super(rcd, navGpu);

        let old_reqestAdapter = navGpu.requestAdapter;
        navGpu.requestAdapter = async (options?: GPURequestAdapterOptions) => {
            let result = await old_reqestAdapter.call(navGpu, options);
            new FFAdapter(rcd, result, this, options);
            return result;
        };
    }

    addInitActions(rcd: FFRecorder): void {
        rcd.addInitAction(assignment(this, 'navigator.gpu'));
    }
}
