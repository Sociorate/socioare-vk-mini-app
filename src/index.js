import 'core-js/features/map'
import 'core-js/features/set'

import React from 'react'
import ReactDOM from 'react-dom'

import App from './App'

import bridge from '@vkontakte/vk-bridge'

import {
    GoogleReCaptchaProvider,
} from 'react-google-recaptcha-v3'

// Init VK  Mini App
bridge.send('VKWebAppInit')

ReactDOM.render(
    <React.StrictMode><GoogleReCaptchaProvider
        reCaptchaKey='6LdaadgZAAAAAGS9bFNXJ-s4L013vb7Na9J8EgyG'
        language='ru'
        useRecaptchaNet={true}>
        <App />
    </GoogleReCaptchaProvider></React.StrictMode>, document.getElementById('root'))

if (process.env.NODE_ENV === 'development') {
    import('./eruda').then(({ default: eruda }) => { }) //runtime download
}
