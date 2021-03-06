/*
 * Copyright (c) 2017. The Hyve and respective contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * See the file LICENSE in the root of this repository.
 *
 */
import { Injectable } from '@angular/core';
import { AccountService } from './account.service';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class Principal {
    private _identity: any;
    private authenticated = false;
    private authenticationState = new BehaviorSubject<any>(null);

    constructor(
        private account: AccountService
    ) {}

    authenticate (_identity) {
        this._identity = _identity;
        this.authenticated = _identity !== null;
        this.authenticationState.next(this._identity);
    }

    hasAnyAuthority (authorities: string[]): Promise<boolean> {
        if (!this.authenticated || !this._identity || !this._identity.authorities) {
            return Promise.resolve(false);
        }

        for (let i = 0; i < authorities.length; i++) {
            if (this._identity.authorities.indexOf(authorities[i]) !== -1) {
                return Promise.resolve(true);
            }
        }

        return Promise.resolve(false);
    }

    hasAuthority (authority: String): Promise<boolean> {
        if (!this.authenticated) {
           return Promise.resolve(false);
        }

        return this.identity().then(id => {
            return Promise.resolve(id.authorities && id.authorities.indexOf(authority) !== -1);
        }, () => {
            return Promise.resolve(false);
        });
    }

    identity (force?: boolean): Promise<any> {
        if (force === true) {
            this._identity = undefined;
        }

        // check and see if we have retrieved the _identity data from the server.
        // if we have, reuse it by immediately resolving
        if (this._identity) {
            return Promise.resolve(this._identity);
        }

        // retrieve the _identity data from the server, update the _identity object, and then resolve.
        return this.account.get().toPromise().then(account => {
            if (account) {
                this._identity = account;
                this.authenticated = true;
            } else {
                this._identity = null;
                this.authenticated = false;
            }
            this.authenticationState.next(this._identity);
            return this._identity;
        }).catch(err => {
            this._identity = null;
            this.authenticated = false;
            this.authenticationState.next(this._identity);
            return null;
        });
    }

    isAuthenticated (): boolean {
        return this.authenticated;
    }

    isIdentityResolved (): boolean {
        return this._identity !== undefined;
    }

    getAuthenticationState(): BehaviorSubject<any> {
        return this.authenticationState;
    }

    getImageUrl(): String {
        return this.isIdentityResolved () ? this._identity.imageUrl : null;
    }
}
