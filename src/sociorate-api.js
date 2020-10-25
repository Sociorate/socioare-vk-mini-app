const endpoint = 'https://sociorate-backend.herokuapp.com'
const urlParams = (() => {
    let params = new URLSearchParams(window.location.search)

    let orderedParams = new URLSearchParams()

    for (let [key, value] of params.entries()) {
        if (key.substring(0, 3) === 'vk_') {
            orderedParams.set(key, value)
        }
    }

    return orderedParams.toString()
})()
const urlPramsSign = new URLSearchParams(window.location.search).get('sign')

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
            } else if (response.data) {
                resolve(response.data)
            } else {
                reject({
                    code: 666,
                    description: "No data field"
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

function postRating(userid, rate, reCaptchaToken) {
    return newApiRequest('/post_rating', JSON.stringify({
        userid: Number(userid),
        rate: Number(rate),
        recaptcha_token: String(reCaptchaToken),
        url_params: {
            params: String(urlParams),
            sign: String(urlPramsSign),
        },
    }))
}

function getRating(userid) {
    return newApiRequest('/get_rating', JSON.stringify({
        userid: Number(userid),
    }))
}

export {
    postRating,
    getRating,
}