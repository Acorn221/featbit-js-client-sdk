import { VariationDataType } from "./types";
import { logger } from "./logger";
export function serializeUser(user) {
    var _a;
    if (!user) {
        return "";
    }
    var builtInProperties = "".concat(user.keyId, ",").concat(user.name);
    var customizedProperties = (_a = user.customizedProperties) === null || _a === void 0 ? void 0 : _a.map(function (p) { return "".concat(p.name, ":").concat(p.value); }).join(",");
    return "".concat(builtInProperties, ",").concat(customizedProperties);
}
/**
 * Checks if a string is numeric
 *
 * @param {string} str - The string to check.
 * @returns {boolean} - Returns `true` if the string is numeric, `false` otherwise.
 */
export function isNumeric(str) {
    // We only process strings, if not a string, return false
    if (typeof str !== "string")
        return false;
    // Use type coercion to parse the totality of the string
    // @ts-expect-error `parseFloat` alone doesn't achieve this
    var isNumber = !isNaN(str);
    // Ensure strings composed solely of whitespace fail
    var parsedNumber = !isNaN(parseFloat(str));
    return isNumber && parsedNumber;
}
export function parseVariation(type, value) {
    switch (type) {
        case VariationDataType.string:
            return value;
        case VariationDataType.boolean:
            if (value === "true") {
                return true;
            }
            if (value === "false") {
                return false;
            }
            logger.log("expected boolean value, but got ".concat(value));
            return value;
        case VariationDataType.number:
            if (isNumeric(value)) {
                return +value;
            }
            logger.log("expected numeric value, but got ".concat(value));
            return value;
        case VariationDataType.json:
            try {
                return JSON.parse(value);
            }
            catch (e) {
                logger.log("expected json value, but got ".concat(value));
                return value;
            }
        default:
            logger.log("unexpected variation type ".concat(type, " for ").concat(value));
            return value;
    }
}
export function uuid() {
    var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0, v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
    return uuid;
}
export function validateUser(user) {
    if (!user) {
        return "user must be defined";
    }
    var keyId = user.keyId, name = user.name;
    if (keyId === undefined || keyId === null || keyId.trim() === "") {
        return "keyId is mandatory";
    }
    if (name === undefined || name === null || name.trim() === "") {
        return "name is mandatory";
    }
    return null;
}
export function validateOption(option) {
    if (option === undefined || option === null) {
        return "option is mandatory";
    }
    var api = option.api, secret = option.secret, anonymous = option.anonymous, user = option.user, enableDataSync = option.enableDataSync;
    if (enableDataSync &&
        (api === undefined || api === null || api.trim() === "")) {
        return "api is mandatory in option";
    }
    if (enableDataSync &&
        (secret === undefined || secret === null || secret.trim() === "")) {
        return "secret is mandatory in option";
    }
    // validate user
    if (!!anonymous === false && !user) {
        return "user is mandatory when not using anonymous user";
    }
    if (user) {
        return validateUser(user);
    }
    return null;
}
// add style to html element
export function addCss(element, style) {
    for (var property in style) {
        element.style[property] = style[property];
    }
}
/********************** encode text begin *****************************/
var alphabet = {
    "0": "Q",
    "1": "B",
    "2": "W",
    "3": "S",
    "4": "P",
    "5": "H",
    "6": "D",
    "7": "X",
    "8": "Z",
    "9": "U",
};
function encodeNumber(param, length) {
    var s = "000000000000" + param;
    var numberWithLeadingZeros = s.slice(s.length - length);
    return numberWithLeadingZeros
        .split("")
        .map(function (n) { return alphabet[n]; })
        .join("");
}
// generate connection token
export function generateConnectionToken(text) {
    text = text.replace(/=*$/, "");
    var timestamp = Date.now();
    var timestampCode = encodeNumber(timestamp, timestamp.toString().length);
    // get random number less than the length of the text as the start point, and it must be greater or equal to 2
    var start = Math.max(Math.floor(Math.random() * text.length), 2);
    return "".concat(encodeNumber(start, 3)).concat(encodeNumber(timestampCode.length, 2)).concat(text.slice(0, start)).concat(timestampCode).concat(text.slice(start));
}
/********************** encode text end *****************************/
//# sourceMappingURL=utils.js.map