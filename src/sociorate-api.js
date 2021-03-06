// const endpoint = 'https://localhost'
const endpoint = 'https://api.sociorate.ru'

const vkLanguage = (new URLSearchParams(window.location.search)).get('vk_language')

function createSignParams() {
    const urlParams = new URLSearchParams(window.location.search)

    const signParamsOrderedString = (() => {
        let orderedParams = new URLSearchParams()

        for (let [key, value] of urlParams.entries()) {
            if (key.substring(0, 3) === 'vk_') {
                orderedParams.set(key, value)
            }
        }

        return orderedParams.toString()
    })()

    return {
        params: String(signParamsOrderedString),
        sign: String(urlParams.get('sign'))
    }
}

const signParams = createSignParams()

function newApiRequest(method, data) {
    let xhr = new XMLHttpRequest()

    xhr.open("POST", `${endpoint}${method}`, true)
    xhr.send(data)

    return new Promise((resolve, reject) => {
        xhr.onload = () => {
            let response = null

            try {
                response = JSON.parse(xhr.response)
            } catch (err) {
                reject({
                    code: 666,
                    description: `JSON parse error: ${err}`,
                })
            }

            if (response.error) {
                reject(response.error)
            } else if (response.response) {
                resolve(response.response)
            } else {
                reject({
                    code: 666,
                    description: "No `response` field"
                })
            }
        }

        xhr.onerror = () => {
            reject({
                code: 69,
                description: "Network error",
            })
        }
    })
}

function postRating(userid, rate) {
    return newApiRequest('/post_rating', JSON.stringify({
        vk_user_id: Number(userid),
        rate: Number(rate),
        sign_params: signParams,
    }))
}

function getRating(userid) {
    return newApiRequest('/get_rating', JSON.stringify({
        vk_user_id: Number(userid),
    }))
}

function vkUsersGet(userids) {
    return newApiRequest('/vk_users_get', JSON.stringify({
        user_ids: String(userids),
        lang: String(vkLanguage),
        sign_params: signParams,
    }))
}

export {
    postRating,
    getRating,
    vkUsersGet,
}
