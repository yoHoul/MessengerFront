import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, of, shareReplay, take, tap } from 'rxjs';

import { ChatParticipant, ChatRole } from '../type/chat-participant';
import { User } from '../type/user';
import { UserProfileApiService } from './user-profile-api.service';

@Injectable({ providedIn: 'root' })
export class GroupInfoApiService {
  private readonly http = inject(HttpClient);
  private readonly userProfileApi = inject(UserProfileApiService);

  private readonly participantsState = signal<ChatParticipant[] | null>(null);

  private readonly participantsRequest = this.http
    .get<ChatParticipant[]>('assets/mocks/participants.json')
    .pipe(shareReplay(1));

  getMembers(chatId: string): Observable<User[]> {
    return forkJoin({
      participants: this.ensureParticipants(),
      users: this.userProfileApi.getUsers().pipe(take(1)),
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

  createGroup(
    chatId: string,
    ownerId: string,
    memberIds: string[],
  ): Observable<void> {
    return this.addMembersInternal(chatId, [ownerId, ...memberIds], ownerId);
  }

  addMembers(chatId: string, memberIds: string[]): Observable<void> {
    return this.addMembersInternal(chatId, memberIds);
  }

  removeMember(chatId: string, userId: string): Observable<void> {
    return this.ensureParticipants().pipe(
      tap((participants) =>
        this.participantsState.set(
          participants.filter(
            (participant) =>
              participant.chatId !== chatId ||
              participant.userId !== userId,
          ),
        ),
      ),
      map(() => undefined),
    );
  }

  deleteGroup(chatId: string): Observable<void> {
    return this.ensureParticipants().pipe(
      tap((participants) =>
        this.participantsState.set(
          participants.filter(
            (participant) => participant.chatId !== chatId,
          ),
        ),
      ),
      map(() => undefined),
    );
  }

  private addMembersInternal(
    chatId: string,
    memberIds: string[],
    ownerId?: string,
  ): Observable<void> {
    return this.ensureParticipants().pipe(
      tap((participants) => {
        const existingIds = new Set(
          participants
            .filter((participant) => participant.chatId === chatId)
            .map((participant) => participant.userId),
        );
        const additions = memberIds
          .filter((userId) => !existingIds.has(userId))
          .map((userId) =>
            this.createParticipant(
              chatId,
              userId,
              userId === ownerId ? 'owner' : 'member',
            ),
          );

        if (additions.length > 0) {
          this.participantsState.set([...participants, ...additions]);
        }
      }),
      map(() => undefined),
    );
  }

  private ensureParticipants(): Observable<ChatParticipant[]> {
    const participants = this.participantsState();

    if (participants) {
      return of(participants);
    }

    return this.participantsRequest.pipe(
      tap((loaded) => this.participantsState.set(loaded)),
    );
  }

  private createParticipant(
    chatId: string,
    userId: string,
    role: ChatRole,
  ): ChatParticipant {
    return {
      chatId,
      userId,
      role,
      joinedAt: new Date().toISOString(),
      lastReadMessageId: null,
      unreadCount: 0,
      muted: false,
      pinned: false,
    };
  }
}
