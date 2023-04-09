import { stringify } from "../util/stringify";
import { FFObject } from "./object";

export function statement(stmt: string): string {
    return `${stmt};`;
}

export function assignment(result: FFObject<any>, value: any): string {
    return `${result.name} = ${value};`;
}

export function propertyAssignment(result: FFObject<any>, propName: string, value: any): string {
    return `${result.name}.${propName} = ${value};`;
}

export function methodCall(callee: FFObject<any>, method: string, args: any[], result?: FFObject<any>): string {
    // Trim undefined values off the end, they aren't needed
    args = args.slice();
    while (args.length > 0 && args[args.length - 1] === undefined) {
        args.pop();
    }

    let resultName = '';
    if (result != null) {
        resultName = `${result.name} = `;
    }

    return `${resultName}${callee.name}.${method}(${args.map(stringify).join(', ')});`;
}

export function asyncMethodCall(callee: FFObject<any>, method: string, args: any[], result?: FFObject<any>): string {
    // Trim undefined values off the end, they aren't needed
    args = args.slice();
    while (args.length > 0 && args[args.length - 1] === undefined) {
        args.pop();
    }

    let resultName = '';
    if (result != null) {
        resultName = `${result.name} = `;
    }

    return `${resultName}await ${callee.name}.${method}(${args.map(stringify).join(', ')});`;
}
