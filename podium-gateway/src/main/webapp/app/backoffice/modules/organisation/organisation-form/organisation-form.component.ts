/*
 * Copyright (c) 2017. The Hyve and respective contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * See the file LICENSE in the root of this repository.
 *
 */
import { Component, OnInit } from '@angular/core';
import { JhiEventManager, JhiAlertService } from 'ng-jhipster';
import { Principal } from '../../../../shared';
import { User } from '../../../../shared/user/user.model';
import { Response } from '@angular/http';
import { ActivatedRoute, Router } from '@angular/router';
import { RequestType } from '../../../../shared/request/request-type';
import { Organisation } from '../../../../shared/organisation/organisation.model';
import { OrganisationService } from '../../../../shared/organisation/organisation.service';

@Component({
    selector: 'pdm-organisation-form',
    templateUrl: './organisation-form.component.html',
    styleUrls: ['organisation-form.scss']
})
export class OrganisationFormComponent implements OnInit {

    currentAccount: User;
    organisation: Organisation;
    error: any;
    success: any;
    isSaving: boolean;
    requestTypes: any = RequestType;

    constructor(
        private organisationService: OrganisationService,
        private alertService: JhiAlertService,
        private principal: Principal,
        private eventManager: JhiEventManager,
        private route: ActivatedRoute,
        private router: Router
    ) {

    }

    ngOnInit() {
        this.principal.identity().then((account) => {
            this.currentAccount = account;
        });

        this.route.params.subscribe(params => {
            let uuid = params['uuid'];
            if (uuid) {
                this.organisationService.findByUuid(uuid).subscribe(
                    (organisation) => { this.organisation = organisation; },
                    (res) => this.onError(res)
                );
            } else {
                this.organisation = new Organisation();
                this.organisation.requestTypes = [];
                this.organisation.roles = [];
            }
        });
    }

    onSaveSuccess (result, isCreate: boolean) {
        if (isCreate) {
            this.organisation = result;
        }

        let notification = isCreate ? 'organisation.saved' : 'organisation.updated';

        this.alertService.success(notification);
        this.isSaving = false;
    }

    onSaveError (error) {
        this.isSaving = false;
        this.onError(error);
    }

    onError (error) {
        this.alertService.error(error.message, null, null);
    }

    save () {
        this.isSaving = true;
        if (this.organisation.uuid) {
            this.organisationService.update(this.organisation)
                .subscribe(
                    (res: Response) => this.onSaveSuccess(res, false),
                    (res: Response) => this.onSaveError(res.json())
                );
        } else {
            this.organisationService.create(this.organisation)
                .subscribe(
                    (res: Response) => this.onSaveSuccess(res, true),
                    (res: Response) => this.onSaveError(res.json())
                );
        }
    }

    cancel() {
        return this.router.navigate(['/bbmri/organisation']);
    }

    updateRequestType(selectedRequestType, event) {
        let _idx = this.organisation.requestTypes.indexOf(selectedRequestType.value);
        if ( _idx < 0) {
            this.organisation.requestTypes.push(selectedRequestType.value);
        } else {
            this.organisation.requestTypes.splice(_idx, 1);
        }
    }

    isOrganisationAdmin (currentUser: User) {
        if (currentUser) {
            return currentUser.authorities.indexOf('ROLE_ORGANISATION_ADMIN') > -1;
        }
    }
}
