import { ChangeDetectionStrategy, Component, OnInit, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-project-media',
  templateUrl: './project-media.html',
  styleUrl: './project-media.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectMedia implements OnInit {
  title = input.required<string>();
  screenshots = input.required<string[]>();
  videoUrl = input<string>();

  private readonly activeIndex = signal(0);
  protected readonly videoSrc = signal<string | null>(null);

  ngOnInit(): void {
    // Autoplay as soon as the project is opened, instead of requiring a click on a poster.
    const url = this.videoUrl();
    if (url) {
      this.videoSrc.set(url);
    }
  }

  protected readonly currentImage = computed(() => this.screenshots()[this.activeIndex()]);
  protected readonly hasMultiple = computed(() => this.screenshots().length > 1);

  protected next(): void {
    const total = this.screenshots().length;
    this.activeIndex.set((this.activeIndex() + 1) % total);
  }

  protected previous(): void {
    const total = this.screenshots().length;
    this.activeIndex.set((this.activeIndex() - 1 + total) % total);
  }

  protected goTo(index: number): void {
    this.activeIndex.set(index);
  }

  protected isActive(index: number): boolean {
    return this.activeIndex() === index;
  }

  protected playVideo(): void {
    const url = this.videoUrl();
    if (url) {
      this.videoSrc.set(url);
    }
  }

  protected stopVideo(): void {
    this.videoSrc.set(null);
  }
}
