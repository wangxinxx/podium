/*
 * Copyright (c) 2017  The Hyve and respective contributors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * See the file LICENSE in the root of this repository.
 */

package org.bbmri.podium.service;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.Signature;
import org.bbmri.podium.aop.security.*;
import org.bbmri.podium.common.IdentifiableOrganisation;
import org.bbmri.podium.common.IdentifiableUser;
import org.bbmri.podium.domain.Role;
import org.bbmri.podium.security.SecurityService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * This service implements the security checks of the {@link AccessPolicyAspect}.
 * The list of supported annotations is in {@link #SECURITY_ANNOTATION_TYPES}.
 */
@Service
@Transactional
public class AccessPolicyService {

    @Autowired
    SecurityService securityService;

    private static final Logger log = LoggerFactory.getLogger(AccessPolicyService.class);

    private static final Set<Class> SECURITY_ANNOTATION_TYPES = new HashSet<>();
    {
        SECURITY_ANNOTATION_TYPES.add(Public.class);
        SECURITY_ANNOTATION_TYPES.add(AnyAuthorisedUser.class);
        SECURITY_ANNOTATION_TYPES.add(SecuredByAuthority.class);
        SECURITY_ANNOTATION_TYPES.add(SecuredByOrganisation.class);
        SECURITY_ANNOTATION_TYPES.add(SecuredByCurrentUser.class);
    }

    /**
     * Check if the annotation is a supported security annotation.
     * @param annotation The annotation to be checked.
     * @return true iff the annotation is of a type supported by this service.
     */
    public static boolean isSecurityAnnotation(Annotation annotation) {
        if (annotation == null) {
            return false;
        }
        return SECURITY_ANNOTATION_TYPES.contains(annotation.annotationType());
    }

    /**
     * Checks if the current user has any of the authorities listed in {@code annotation}.
     * @param annotation the {@link SecuredByAuthority} annotation.
     * @return true iff the current user has any of the authorities in {@code annotation}.
     */
    private boolean checkSecuredByAuthority(SecuredByAuthority annotation) {
        for (String authority: annotation.value()) {
            log.info("Annotation authority: {}", authority);
        }
        if (securityService.isCurrentUserInAnyRole(annotation.value())) {
            log.info("Access granted to user based on authorities {}",
                Arrays.toString(annotation.value()));
            return true;
        } else {
            log.info("Access denied to user based on authorities {}",
                Arrays.toString(annotation.value()));
            return false;
        }
    }

    private static UUID getOrganisationUuid(Object object) {
        if (!IdentifiableOrganisation.class.isAssignableFrom(object.getClass())) {
            log.error("Parameter value has the wrong type: {} (expected {}).",
                object.getClass().getSimpleName(),
                IdentifiableOrganisation.class.getSimpleName()
            );
            return null;
        }
        IdentifiableOrganisation organisation = (IdentifiableOrganisation)object;
        return organisation.getOrganisationUuid();
    }

    private static UUID getUserUuid(Object object) {
        if (!IdentifiableUser.class.isAssignableFrom(object.getClass())) {
            log.error("Parameter value has the wrong type: {} (expected {}).",
                object.getClass().getSimpleName(),
                IdentifiableUser.class.getSimpleName()
            );
            return null;
        }
        IdentifiableUser user = (IdentifiableUser)object;
        return user.getUserUuid();
    }

    /**
     * Gets the parameter with name {@code name} from the current execution context ({@code joinPoint})
     * and returns the value with type {@code parameterType}.
     * Returns null if the parameter is not of a compatible type or if the metadata of the function cannot
     * be found (e.g., multiple methods with the same name).
     *
     * @param joinPoint the current execution context.
     * @return the value of the parameter with name @{code name} as type {@code parameterType} if
     * the value is of compatible type and the metadata can be found; null otherwise.
     */
    private UUID getUuid(JoinPoint joinPoint, Function<Object, UUID> getObjectUuid,
                             Class<? extends Annotation> objectAnnotation, Class<? extends Annotation> uuidAnnotation) {
        Signature signature = joinPoint.getStaticPart().getSignature();
        Class type = signature.getDeclaringType();
        List<Method> methods = Arrays.stream(type.getDeclaredMethods()).filter(m ->
            signature.getName().equals(m.getName())
        ).collect(Collectors.toList());
        if (methods.isEmpty()) {
            log.error("No method {} found in class {}.", signature.getName(), signature.getDeclaringTypeName());
            return null;
        } else if (methods.size() > 1) {
            log.error("Multiple methods named {} found in class {}.", signature.getName(), signature.getDeclaringTypeName());
            return null;
        }
        Method method = methods.get(0);
        if (joinPoint.getArgs().length != method.getParameterCount()) {
            log.error("Unexpected argument list length: {} (expected {}).",
                joinPoint.getArgs().length,
                method.getParameterCount());
            return null;
        }
        for(int i=0; i < method.getParameterCount(); i++) {
            Parameter parameter = method.getParameters()[i];
            log.debug("Checking parameter {}: {}", i, parameter.getName());
            if (parameter.getAnnotationsByType(uuidAnnotation).length > 0) {
                if (!UUID.class.isAssignableFrom(parameter.getType())) {
                    log.error("Parameter has the wrong type: {} (expected {}).",
                        parameter.getType().getSimpleName(),
                        UUID.class.getSimpleName());
                    return null;
                }
                Object value = joinPoint.getArgs()[i];
                if (!UUID.class.isAssignableFrom(value.getClass())) {
                    log.error("Parameter value has the wrong type: {} (expected {}).",
                        value.getClass().getSimpleName(),
                        UUID.class.getSimpleName());
                    return null;
                }
                return (UUID)value;
            } else {
                log.debug("No annotation of type {} found on {}", uuidAnnotation.getSimpleName(), parameter.getName());
            }
            if (parameter.getAnnotationsByType(objectAnnotation).length > 0) {
                Object value = joinPoint.getArgs()[i];
                UUID uuid = getObjectUuid.apply(value);
                log.debug("UUID of object {}: {}", value, uuid);
                return uuid;
            } else {
                log.debug("No annotation of type {} found on {}", objectAnnotation.getSimpleName(), parameter.getName());
            }
        }
        log.info("No match... returning null.");
        return null;
    }

    /**
     * Checks if the current user holds any of the authorities specified in the rule for the organisation
     * with the uuid specified by the rule.
     * The rule is specified by the annotation @{code annotation} of type {@link SecuredByOrganisation}.
     *
     * @param annotation the security rule.
     * @param joinPoint the current context.
     * @return true iff the current user holds any of the authorities for the organisation specified by the rule.
     */
    private boolean checkSecuredByOrganisation(SecuredByOrganisation annotation, JoinPoint joinPoint) {
        String signature = joinPoint.getSignature().toShortString();
        UUID organisationUuid = getUuid(joinPoint, AccessPolicyService::getOrganisationUuid,
            OrganisationParameter.class, OrganisationUuidParameter.class);
        if (organisationUuid == null) {
            log.error("No organisation uuid field found in method {}.", signature);
            return false;
        }
        if (securityService.isCurrentUserInAnyOrganisationRole(organisationUuid, annotation.authorities())) {
            log.debug("Access granted to organisation {} for user on method {}",
                organisationUuid, signature);
            return true;
        } else {
            log.debug("Access denied to organisation {} for user on method {}",
                organisationUuid, signature);
            return false;
        }
    }

    /**
     * Checks if the uuid of the current user matches the uuid specified by the rule in {@code annotation}.
     *
     * @param joinPoint the current context.
     * @return true iff the uuid of the current user matches the uuid specified by the rule.
     */
    private boolean checkSecuredByCurrentUser(JoinPoint joinPoint) {
        String signature = joinPoint.getSignature().toShortString();
        UUID userUuid = getUuid(joinPoint, AccessPolicyService::getUserUuid,
            UserParameter.class, UserUuidParameter.class);
        if (userUuid == null) {
            log.error("No user uuid field found in method {}.", signature);
            return false;
        }
        if (securityService.getCurrentUserUuid() == userUuid) {
            log.debug("Access granted to user {} on method {}",
                userUuid, signature);
            return true;
        } else {
            log.debug("Access denied to user {} on method {}",
                userUuid, signature);
            return false;
        }
    }

    /**
     * Check if the security rule specified in {@code annotation} is satisfied by
     * the current context, which is represented by {@code joinPoint}.
     *
     * Supported annotations are {@link Public}, {@link AnyAuthorisedUser},
     * {@link SecuredByAuthority}, {@link SecuredByOrganisation}, and {@link SecuredByCurrentUser}.
     * If {@code annotation} is of another type, false is returned.
     *
     * @param annotation The security rule, specified by an annotation.
     * @param joinPoint The current context, represented by a join point.
     * @return true iff the rule in {@code annotation} is of a supported type and is satisfied
     * by the current context; false otherwise.
     */
    public boolean checkSecurityAnnotation(Annotation annotation, JoinPoint joinPoint) {
        String signature = joinPoint.getSignature().toShortString();
        if (annotation == null) {
            log.debug("Access denied. Empty annotation on method {}", signature);
            return false;
        }
        if (Public.class.isAssignableFrom(annotation.annotationType())) {
            log.debug("Access granted on public method {}", signature);
            return true;
        }
        if (AnyAuthorisedUser.class.isAssignableFrom(annotation.annotationType())) {
            if (securityService.isAuthenticated()) {
                log.debug("Access granted for authenticated user on method {}", signature);
                return true;
            } else {
                log.debug("Access denied for unauthenticated user on method {}", signature);
                return false;
            }
        }
        if (SecuredByAuthority.class.isAssignableFrom(annotation.annotationType())) {
            return checkSecuredByAuthority((SecuredByAuthority)annotation);
        }
        if (SecuredByOrganisation.class.isAssignableFrom(annotation.annotationType())) {
            return checkSecuredByOrganisation((SecuredByOrganisation)annotation, joinPoint);
        }
        if (SecuredByCurrentUser.class.isAssignableFrom(annotation.annotationType())) {
            return checkSecuredByCurrentUser(joinPoint);
        }
        log.debug("Access denied. Unsupported annotation of type {} on method {}",
            annotation.annotationType().getSimpleName(), signature);
        return false;
    }

}
