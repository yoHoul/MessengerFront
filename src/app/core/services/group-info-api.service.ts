import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, shareReplay } from 'rxjs';

import { ChatParticipant } from '../type/chat-participant';
import { User } from '../type/user';
import { UserProfileApiService } from './user-profile-api.service';

@Injectable({ providedIn: 'root' })
export class GroupInfoApiService {
  private readonly http = inject(HttpClient);
  private readonly userProfileApi = inject(UserProfileApiService);

  private readonly participantsRequest = this.http
    .get<ChatParticipant[]>('assets/mocks/participants.json')
    .pipe(shareReplay(1));

  getMembers(chatId: string): Observable<User[]> {
    return forkJoin({
      participants: this.participantsRequest,
      users: this.userProfileApi.getUsers(),
    }).pipe(
      map(({ participants, users }) =>
        participants
          .filter((participant) => participant.chatId === chatId)
          .map((participant) =>
            users.find((user) => user.id === participant.userId),
          )
          .filter((user): user is User => user !== undefined),
      ),
    );
  }
}
