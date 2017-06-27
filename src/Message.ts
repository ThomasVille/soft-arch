import MessageType from './MessageType';

interface Message {
    type: MessageType,
    payload: any
}
export default Message;