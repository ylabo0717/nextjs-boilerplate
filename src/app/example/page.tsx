'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  name: z.string().min(2, '名前は2文字以上で入力してください'),
});

export default function ExamplePage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      name: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    toast.success('フォームが送信されました', {
      description: `名前: ${values.name}, メール: ${values.email}`,
    });
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-8 text-4xl font-bold">Next.js Boilerplate Example</h1>

      <div className={`grid gap-6 md:grid-cols-2`}>
        <Card>
          <CardHeader>
            <CardTitle>サンプルフォーム</CardTitle>
            <CardDescription>React Hook Form + Zod を使用したフォームの例</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名前</FormLabel>
                      <FormControl>
                        <Input placeholder="山田太郎" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>メールアドレス</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="example@email.com" {...field} />
                      </FormControl>
                      <FormDescription>連絡先のメールアドレスを入力してください</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">送信</Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ボタンコンポーネント</CardTitle>
            <CardDescription>shadcn/ui のボタンバリエーション</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button>デフォルト</Button>
              <Button variant="secondary">セカンダリ</Button>
              <Button variant="destructive">削除</Button>
              <Button variant="outline">アウトライン</Button>
              <Button variant="ghost">ゴースト</Button>
              <Button variant="link">リンク</Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm">小サイズ</Button>
              <Button size="default">標準</Button>
              <Button size="lg">大サイズ</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
