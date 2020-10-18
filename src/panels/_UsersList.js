import React from 'react'

import {
    Avatar,
    SimpleCell,
} from '@vkontakte/vkui'

function UsersList({ go, users }) {
    return users.map(user => (
        <SimpleCell key={user.id} onClick={() => { go('profile', user.screen_name ? user.screen_name : `id${user.id}`) }} before={<Avatar size={48} src={user.photo_200} />}>{`${user.first_name} ${user.last_name}`}</SimpleCell>)
    )
}

export default UsersList
