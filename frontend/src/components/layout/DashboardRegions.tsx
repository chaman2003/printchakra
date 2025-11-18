import React, { forwardRef } from 'react';
import { StyledSection, StyledFlex } from '../../ui/primitives';
import { StyledPrimitiveProps } from '../../ui/primitives/StyledSection';
import { StyledFlexProps } from '../../ui/primitives/StyledFlex';

export type DashboardSectionProps = Omit<StyledPrimitiveProps, 'componentKey'>;
export type DashboardFlexProps = Omit<StyledFlexProps, 'componentKey'>;

export const DashboardShell = forwardRef<HTMLDivElement, DashboardSectionProps>((props, ref) => (
  <StyledSection ref={ref} componentKey="Dashboard.Shell" {...props} />
));
DashboardShell.displayName = 'DashboardShell';

export const DashboardLayout = forwardRef<HTMLDivElement, DashboardFlexProps>((props, ref) => (
  <StyledFlex ref={ref} componentKey="Dashboard.Layout" {...props} />
));
DashboardLayout.displayName = 'DashboardLayout';

export const DashboardWorkspace = forwardRef<HTMLDivElement, DashboardSectionProps>((props, ref) => (
  <StyledSection ref={ref} componentKey="Dashboard.Workspace" {...props} />
));
DashboardWorkspace.displayName = 'DashboardWorkspace';

export const DashboardSidebar = forwardRef<HTMLDivElement, DashboardSectionProps>((props, ref) => (
  <StyledSection ref={ref} componentKey="Dashboard.Sidebar" {...props} />
));
DashboardSidebar.displayName = 'DashboardSidebar';

export const DashboardToolbar = forwardRef<HTMLDivElement, DashboardFlexProps>((props, ref) => (
  <StyledFlex ref={ref} componentKey="Dashboard.Toolbar" {...props} />
));
DashboardToolbar.displayName = 'DashboardToolbar';
