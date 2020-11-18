import React from 'react'

import {
    Avatar,
    SimpleCell,
} from '@vkontakte/vkui'

function UsersList({ go, users }) {
    return users.map(user => (
        <SimpleCell
            key={user.id}
            before={<Avatar size={48} src={user.photo_200} />}
            onClick={() => {
                go('profile', { panelProfileUser: user })
            }}
        >{`${user.first_name} ${user.last_name}`}</SimpleCell>
    ))
}

export default UsersList
