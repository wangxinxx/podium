/*
 * Copyright (c) 2017. The Hyve and respective contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * See the file LICENSE in the root of this repository.
 *
 */

import { Component, ViewChild } from '@angular/core';
import { RequestDetail } from '../../../shared/request/request-detail';
import { RequestBase } from '../../../shared/request/request-base';
import { RequestService } from '../../../shared/request/request.service';
import { RequestReviewFeedback } from '../../../shared/request/request-review-feedback';
import { RequestAccessService } from '../../../shared/request/request-access.service';
import { RequestReviewStatusOptions } from '../../../shared/request/request-status/request-status.constants';
import { RequestFormService } from '../../form/request-form.service';
import { Response } from '@angular/http';
import { Router } from '@angular/router';
import { RequestActionToolbarComponent } from '../../../shared/request/action-bars/request-action-toolbar/request-action-toolbar.component';
import { RequestProgressBarComponent } from '../progress-bar/request-progress-bar.component';

@Component({
    selector: 'pdm-request-detail',
    templateUrl: './request-detail.component.html'
})

export class RequestDetailComponent {

    public request: RequestBase;
    public requestDetails: RequestDetail;
    public isInRevision = false;
    public isUpdating = false;

    constructor(
        private router: Router,
        private requestService: RequestService,
        private requestAccessService: RequestAccessService,
        private requestFormService: RequestFormService
    ) {
        // Forcefully reload logged in user
        this.requestAccessService.loadCurrentUser(true);

        this.requestService.onRequestUpdate.subscribe((request: RequestBase) => {
            this.setRequest(request);
        });
    }

    setRequest(request) {
        this.request = request;
        this.requestDetails = request.requestDetail;
        this.isInRevision = false;

        if (this.isRevisionStatusForRequester(request)) {
            this.isInRevision = true;
            this.requestFormService.request = request;
        }
    }

    submitReview(requestReviewFeedback: RequestReviewFeedback) {
        this.isUpdating = true;
        this.requestService.submitReview(this.request.uuid, requestReviewFeedback)
            .subscribe(
                (res) => this.onSuccess(res.json()),
                (err) => this.onError(err)
            );
    }

    requireRequestRevision() {
        this.isUpdating = true;
        this.requestService.requireRevision(this.request.uuid)
            .subscribe(
                (res) => this.onSuccess(res),
                (err) => this.onError(err)
            );
    }

    validateRequest() {
        this.isUpdating = true;
        this.requestService.validateRequest(this.request.uuid)
            .subscribe(
                (res) => this.onSuccess(res),
                (err) => this.onError(err)
            );
    }

    approveRequest() {
        this.isUpdating = true;
        this.requestService.approveRequest(this.request.uuid)
            .subscribe(
                (res) => this.onSuccess(res),
                (err) => this.onError(err)
            );
    }

    rejectRequest() {
        this.isUpdating = true;
        this.requestService.rejectRequest(this.request.uuid)
            .subscribe(
                (res) => this.onSuccess(res),
                (err) => this.onError(err)
            );
    }

    /**
     * Check whether the request belongs to the current user and if the request is in revision
     *
     * @param request the request being processed
     * @returns {boolean} true if the user owns the request and it is in revision
     */
    isRevisionStatusForRequester(request: RequestBase): boolean {
        let revisionStatus = this.requestAccessService.isRequestReviewStatus(request, RequestReviewStatusOptions.Revision);
        let isRequester = this.requestAccessService.isRequesterOf(request);

        return revisionStatus && isRequester;
    }

    onSuccess(response: Response) {
        console.log('success ', response);
        this.request = response.json();
        this.isUpdating = false;

        this.requestService.requestUpdateEvent(this.request);
    }

    onError(err) {
        console.log('error ', err);
        this.isUpdating = false;
    }

}
