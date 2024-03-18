import { FeatureFlagValue, IOption, IUser, VariationDataType } from "./types";
export declare function generateGuid(): string;
export declare function serializeUser(user: IUser | undefined): string;
/**
 * Checks if a string is numeric
 *
 * @param {string} str - The string to check.
 * @returns {boolean} - Returns `true` if the string is numeric, `false` otherwise.
 */
export declare function isNumeric(str: string): boolean;
export declare function parseVariation(type: VariationDataType, value: string): FeatureFlagValue;
export declare function uuid(): string;
export declare function validateUser(user: IUser): string | null;
export declare function validateOption(option: IOption): string | null;
export declare function addCss(element: HTMLElement, style: {
    [key: string]: string;
}): void;
export declare function generateConnectionToken(text: string): string;
/********************** encode text end *****************************/
