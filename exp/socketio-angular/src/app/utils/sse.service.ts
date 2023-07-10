import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SSEService {
  private eventSource: EventSource;
  private updateSubject: any;

  public getUpdates(url: string): Observable<any> {
    this.eventSource = new EventSource(url);
    this.updateSubject = new Observable(observer => {
      this.eventSource.onmessage = event => {
        observer.next(JSON.parse(event.data));
      };
      this.eventSource.onerror = error => {
        observer.error(error);
      };
    });
    return this.updateSubject;
  }

  public closeConnection(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.updateSubject.complete();
    }
  }
}