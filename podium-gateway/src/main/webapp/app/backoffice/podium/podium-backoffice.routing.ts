/*
 * Copyright (c) 2017. The Hyve and respective contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * See the file LICENSE in the root of this repository.
 *
 */
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PodiumGatewayOrganisationModule } from '../modules/organisation/organisation.module';
import { PodiumGatewayUserMgmtModule } from '../modules/user-management/user-management.module';
import { UserGroupAuthority } from '../../shared/authority/authority.constants';

let PODIUM_ROUTES = [
    {
        path: 'admin',
        data: {
            breadcrumb: 'administration',
        },
        children: [
            {
                path: '',
                redirectTo: '/',
                pathMatch: 'full'
            },
            {
                path: 'management',
                data: {
                    breadcrumb: 'organisation management'
                },
                loadChildren: () => PodiumGatewayOrganisationModule
            },
            {
                path: 'user-management',
                data: {
                    breadcrumb: 'user management',
                    userAuthorityGroup: UserGroupAuthority.PodiumAdmin
                },
                loadChildren: () => PodiumGatewayUserMgmtModule
            }
        ]
    }
];

@NgModule({
    imports: [
        RouterModule.forChild(PODIUM_ROUTES)
    ],
    exports: [RouterModule]
})

export class PodiumBackofficeRoutingModule {}
