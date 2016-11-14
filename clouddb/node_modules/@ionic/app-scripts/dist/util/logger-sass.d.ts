import { BuildContext } from './interfaces';
import { Diagnostic } from './logger';
import { SassError } from 'node-sass';
export declare function runSassDiagnostics(context: BuildContext, sassError: SassError): Diagnostic[];
