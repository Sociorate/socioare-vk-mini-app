import React from 'react'

import {
    Avatar,
    SimpleCell,
} from '@vkontakte/vkui'

function UsersList({ setActivePanel, setPanelProfileUser, users }) {
    return users.map(user => (
        <SimpleCell
            key={user.id}
            before={<Avatar size={48} src={user.photo_200} />}
            onClick={() => {
                setPanelProfileUser(user)
                setActivePanel('profile')
            }}
        >{`${user.first_name} ${user.last_name}`}</SimpleCell>
    ))
}

export default UsersList
