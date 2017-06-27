import MessageType from './MessageType';
import Message from './Message';

// TODO renommer en factory
export default class MessageBuilder {
    static createNewInput(input: any): Message {
        return {
            type: 'newInput',
            payload: input
        };
    }
    
    static createAcceptedInput(): Message {
        return {
            type: 'acceptedInput',
            payload: null
        };
    }
}