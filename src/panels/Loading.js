import React from 'react'

import PropTypes from 'prop-types'

import {
    Panel,
    Spinner,
} from '@vkontakte/vkui'

function Loading({ id }) {
    return (
        <Panel id={id}>
            <Spinner size="large" style={{
                position: 'fixed',
                bottom: '0%',
                right: '0%',
            }} />
        </Panel>
    )
}

Loading.propTypes = {
    id: PropTypes.string.isRequired,
}

export default Loading
