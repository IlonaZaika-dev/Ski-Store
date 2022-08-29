import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ErrorPageComponent } from './core/error-page/error-page.component';
import { ErrorTestComponent } from './core/error-test/error-test.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  { path: '', component: HomeComponent, data: {breadcrumb: 'Home'} },
  { path: 'error-test', component: ErrorTestComponent, data: {breadcrumb: 'Test Errors'} },
  { path: 'error-page/:code', component: ErrorPageComponent, data: {breadcrumb: 'Error'} },
  { path: 'shop', loadChildren: () => import('./shop/shop.module').then(mod => mod.ShopModule), data: {breadcrumb: 'Shop'} },
  { path: '**', redirectTo: 'error-page/404', pathMatch: 'full'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
