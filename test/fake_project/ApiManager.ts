import UserModel from "../models/UserModel";
import SessionModel from "../models/SessionModel";
import VoteType from "../models/VoteType";
import GroupModel from "../models/GroupModel";

export default class Api {
    static getSessionListForUser(user: UserModel, state: string): Promise<Array<SessionModel>> {
        let url = `/api/getSessionListByUser/${user._id}/${state}`;

        return fetch(url, { method: 'get' })
		.then(res => {
			return res.json();
		})
        .then(sessionList => {
            return sessionList.map(session => SessionModel.fromDto(this, session));
        });
    }
    
    static getVoteTypeList(): Promise<Array<VoteType>> {
        return fetch(`/api/voteTypes`, { method: 'get' })
		.then(res => {
			return res.json();
		})
		.then((res: Array<any>) => {
			return res.map(t => VoteType.fromDto(t));
		});
    }

    static getGroupListForUser(user: UserModel): Promise<Array<GroupModel>> {
		return fetch(`/api/groupes?users=${user._id}&populate=users`, { method: 'get' })
		.then(res => {
			return res.json();
		})
		.then(groups => {
			return groups.map(g => GroupModel.fromDto(this, g));
		});
    }

    static getSession(sessionId: string): Promise<SessionModel> {
        if(!sessionId) {
			console.warn('Trying to fetch a session with undefined id');
			return;
		}

		return fetch(`/api/getSessionDetail/${sessionId}`, { method: 'get' })
		.then(res => {
			return res.json();
		})
		.then(res => {
			return SessionModel.fromDto(this, res);
		});
    }

    static getGroup(id: string): Promise<GroupModel> {
        if(!id) {
			console.warn('Trying to fetch a group with undefined id');
			return;
		}

		return fetch(`/api/groupes/${id}?populate=users`, { method: 'get' })
		.then(res => {
			return res.json();
		})
		.then(group => {
			return GroupModel.fromDto(this, group);
		});
    }

	static setSeenByMe(sessionId: string, userId: string) {
		if(!sessionId) {
			console.warn('Trying to setSeenBy a session with undefined id');
			return;
		}

		return fetch(`/api/setSeenBy/${sessionId}/${userId}`, { method: 'post' })
		.then(res => {
			return res.json();
		});
	}

	static signUp(mail: string, login: string, mdp: string) {
		return fetch(`/api/signUp/${mail}/${login}/${mdp}`, { method: 'post' })
		.then(res => {
			return res.json();
		});
	}


}