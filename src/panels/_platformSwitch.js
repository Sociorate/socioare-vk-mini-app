const currentPlatform = new URLSearchParams(window.location.search).get("vk_platform")

// Возможные значения в массиве platforms:
// mobile_android
// mobile_iphone
// mobile_web
// desktop_web
// mobile_android_messenger
// mobile_iphone_messenger
function platformSwitch(platforms, callback, elseCallback) {
    if (platforms.indexOf(currentPlatform) !== -1) {
        if (callback) {
            return callback()
        }
    } else {
        if (elseCallback) {
            return elseCallback()
        }
    }

    return null
}

export default platformSwitch
