import React from 'react'

import {
    Snackbar,
    Avatar,
} from '@vkontakte/vkui'

import {
    Icon24Error,
    Icon24Done,
} from '@vkontakte/icons'

function showErrorSnackbar(setSnackbar, children) {
    setSnackbar(<Snackbar
        layout='vertical'
        onClose={() => setSnackbar(null)}
        before={<Avatar size={24} style={{ backgroundColor: 'var(--dynamic_red)' }}><Icon24Error fill='#fff' width={14} height={14} /></Avatar>}
    >{children}</Snackbar>)
}

function showSuccessSnackbar(setSnackbar, children) {
    setSnackbar(<Snackbar
        layout='vertical'
        onClose={() => setSnackbar(null)}
        before={<Avatar size={24} style={{ backgroundColor: 'var(--dynamic_green)' }}><Icon24Done fill="#fff" width={14} height={14} /></Avatar>}
    >{children}</Snackbar>)
}

export {
    showErrorSnackbar,
    showSuccessSnackbar,
}
