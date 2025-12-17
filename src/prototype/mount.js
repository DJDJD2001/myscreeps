const mountCreep = require('./prototype_creep')
const mountRoomPosition = require('./prototype_RoomPosition')
const mountSpawn = require('./prototype_spawn')
const mountRoom = require('./prototype_room')

/**
 * 挂载所有原型扩展
 */
module.exports = function () {
    mountCreep()
    mountRoomPosition()
    mountSpawn()
    mountRoom()
}