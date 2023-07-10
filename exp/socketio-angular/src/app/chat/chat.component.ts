import { Component } from '@angular/core';
import { ChatService } from '../utils/chat.service';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss']
})
export class ChatComponent {
    user: String;
    room: String;
    messageText: String;
    public users: any;
    messageArray: Array<{ user: String, message: String }> = [];
    
    constructor(
        private _chatService: ChatService
    ) {
        this._chatService.newUserJoined()
            .subscribe(data => this.messageArray.push(data));

        this._chatService.userLeftRoom()
            .subscribe(data => this.messageArray.push(data));

        this._chatService.newMessageReceived()
            .subscribe(data => this.messageArray.push(data));
        this._chatService.getUserList()
          .subscribe(data => {
            console.log(data);
            
            this.users = data;
          });
        this._chatService.getChatRoom()
          .subscribe(data => console.log(data));
    }

    join() {
        this._chatService.joinRoom({ user: this.user, room: this.room });
    }

    leave() {
        this.users = undefined;
        this._chatService.leaveRoom({ user: this.user, room: this.room });
    }

    sendMessage() {
        this._chatService.sendMessage({ user: this.user, room: this.room, message: this.messageText });
    }
}
