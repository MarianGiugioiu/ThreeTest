import { Component, OnInit } from '@angular/core';
import { ChatService } from '../utils/chat.service';

@Component({
  selector: 'app-chat-test',
  templateUrl: './chat-test.component.html',
  styleUrls: ['./chat-test.component.scss']
})
export class ChatTestComponent implements OnInit {

  constructor(chatService: ChatService) { }

  ngOnInit(): void {
  }

}
