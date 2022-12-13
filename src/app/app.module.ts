import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CubeComponent } from './cube/cube.component';
import { MandelbulbComponent } from './mandelbulb/mandelbulb.component';
import { PhysicsComponent } from './physics/physics.component';
import { ProcmapComponent } from './procmap/procmap.component';
import { ShadersComponent } from './shaders/shaders.component';

@NgModule({
  declarations: [
    AppComponent,
    CubeComponent,
    ProcmapComponent,
    PhysicsComponent,
    MandelbulbComponent,
    ShadersComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
