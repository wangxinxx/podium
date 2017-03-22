/*
 * Copyright (c) 2017. The Hyve and respective contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * See the file LICENSE in the root of this repository.
 *
 */

import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PodiumGatewaySharedModule } from '../../shared';
import {
    organisationRoute,
    organisationPopupRoute,
    OrganisationPopupService,
    OrganisationComponent,
    OrganisationDialogComponent,
    OrganisationDetailComponent,
    OrganisationDeleteDialogComponent,
    OrganisationPopupComponent,
    OrganisationDeletePopupComponent,
    OrganisationService,
    OrganisationResolvePagingParams,
} from '../';
import { OrganisationRoutingModule } from './organisation.routing';
import { customHttpProvider } from '../../blocks/interceptor/http.provider';

@NgModule({
    imports: [
        PodiumGatewaySharedModule,
        OrganisationRoutingModule
    ],
    declarations: [
        OrganisationComponent,
        OrganisationDetailComponent,
        OrganisationDialogComponent,
        OrganisationDeleteDialogComponent,
        OrganisationPopupComponent,
        OrganisationDeletePopupComponent,
    ],
    entryComponents: [
        OrganisationComponent,
        OrganisationDialogComponent,
        OrganisationPopupComponent,
        OrganisationDeleteDialogComponent,
        OrganisationDeletePopupComponent,
    ],
    providers: [
        customHttpProvider(),
        OrganisationService,
        OrganisationPopupService,
        OrganisationResolvePagingParams,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    exports: []
})
export class PodiumGatewayOrganisationModule {}
